// Identifies e-waste devices in a photo, for the organization pickup wizard
// (S25) -- inventory mode: what the device is and what its tag says, never
// what it is worth. Pricing belongs to the business appraisal flow and to the
// catalog, not to the model (plan §6: "AI never prices").
//
// GEMINI_API_KEY lives here and only here. Shipping it in an EXPO_PUBLIC_* var
// would hand every installed app a key that bills to this project.

const MODEL = "gemini-2.5-flash";
// A scan that comes back unsure gets one more look from the larger model
// before the user is asked to type the device in by hand.
const RETRY_MODEL = "gemini-2.5-pro";
const CONFIDENCE_GATE = 70;

const CATEGORIES = [
  "computers_laptops",
  "monitors_displays",
  "server_gear",
  "copiers_printers",
  "batteries_ups",
] as const;

// Mirrors scanResultSchema in packages/shared. Gemini is constrained to this
// shape by responseSchema, so there is no free text to parse defensively --
// but the client still re-parses, because this is a network boundary.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          deviceCategory: { type: "string", enum: CATEGORIES },
          make: { type: "string", nullable: true },
          model: { type: "string", nullable: true },
          serial: { type: "string", nullable: true },
          confidence: { type: "integer" },
        },
        required: ["deviceCategory", "make", "model", "serial", "confidence"],
      },
    },
  },
  required: ["items"],
};

const PROMPT = `You are cataloguing electronic waste for a recycling pickup.

List every distinct device you can see. For each one give:
- deviceCategory: one of computers_laptops, monitors_displays, server_gear, copiers_printers, batteries_ups
- make and model, or null if you cannot read them
- serial: the serial number or asset tag if one is legible in the image, otherwise null
- confidence: 0-100, how sure you are of the category and identification

Report only what is visible. Never guess a serial number: a wrong serial on a
compliance manifest is worse than a missing one. If you can see a device but
cannot identify it beyond its category, say so with a lower confidence rather
than inventing a make or model.`;

async function callGemini(model: string, imageBase64: string, mimeType: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": Deno.env.get("GEMINI_API_KEY")!,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini returned ${res.status}: ${await res.text()}`);
  }
  const body = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text) as { items: { confidence: number }[] };
}

Deno.serve(async (req) => {
  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) {
      return Response.json({ error: "No image supplied" }, { status: 400 });
    }

    let result = await callGemini(MODEL, imageBase64, mimeType ?? "image/jpeg");

    // One retry on the larger model, and only when the whole scan is unsure --
    // a single hard item among five confident ones is not worth a second call.
    const lowest = result.items.reduce(
      (min: number, item) => Math.min(min, item.confidence ?? 0),
      100,
    );
    if (result.items.length > 0 && lowest < CONFIDENCE_GATE) {
      try {
        result = await callGemini(RETRY_MODEL, imageBase64, mimeType ?? "image/jpeg");
      } catch {
        // The Flash result is still usable; the client sends anything under
        // the gate to manual entry anyway.
      }
    }

    return Response.json(result);
  } catch (e) {
    // The message reaches a user standing in a storeroom holding a phone, so
    // it says what to do rather than what broke.
    console.error("scan-inventory failed", e);
    return Response.json(
      { error: "Couldn't read that photo. Try again with more light, or add the device by hand." },
      { status: 502 },
    );
  }
});
