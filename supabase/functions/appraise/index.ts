// Appraisal scan for the business portal (S35-S37): what a vendor is holding,
// and what Rebin will pay for it.
//
// Same shape as scan-inventory, one decisive difference: the model is told the
// component keys that exist in the live catalog, and the prices are attached
// here from that catalog -- never by the model (plan §6, "AI never prices").
// A rate change is then one row, and every quote can be explained by pointing
// at the catalog version it was priced against.

import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = "gemini-flash-latest";
const RETRY_MODEL = "gemini-pro-latest";
const CONFIDENCE_GATE = 70;

const GRADES = ["working", "broken", "parts"] as const;

type CatalogRow = {
  component_key: string;
  display_name: string;
  grade: string;
  unit: string;
  unit_price_cents: number;
  catalog_version_id: string;
};

function buildPrompt(components: { key: string; label: string }[]): string {
  return `You are appraising a lot of used electronics a recycler has been offered.

Identify each distinct kind of item and how many of it you can see. Use only
these component keys:

${components.map((c) => `- ${c.key}: ${c.label}`).join("\n")}

For each line give:
- componentKey: one of the keys above
- grade: working (intact, looks operable), broken (visible damage or clearly
  dead), or parts (stripped, crushed, or missing major components)
- quantity: how many of that key and grade are visible
- confidence: 0-100
- notes: what you actually saw that led to the grade, in one short phrase

Never state a price; you are not pricing this. If an item does not match any
key above, leave it out rather than forcing it into the closest one. Grade on
visible evidence only -- a closed laptop is not "working" just because it looks
undamaged, so say so in notes and lower the confidence.`;
}

async function callGemini(
  model: string,
  imageBase64: string,
  mimeType: string,
  components: { key: string; label: string }[],
) {
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
              { text: buildPrompt(components) },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    componentKey: { type: "string", enum: components.map((c) => c.key) },
                    grade: { type: "string", enum: GRADES },
                    quantity: { type: "integer" },
                    confidence: { type: "integer" },
                    notes: { type: "string", nullable: true },
                  },
                  required: ["componentKey", "grade", "quantity", "confidence", "notes"],
                },
              },
            },
            required: ["items"],
          },
        },
      }),
    },
  );

  if (!res.ok) throw new Error(`Gemini returned ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text) as {
    items: { componentKey: string; grade: string; quantity: number; confidence: number; notes: string | null }[];
  };
}

Deno.serve(async (req) => {
  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) return Response.json({ error: "No image supplied" }, { status: 400 });

    // Service role, because the catalog read has to succeed for an anonymous
    // browse too, and because the prices attached below must come from the
    // live catalog rather than from anything the caller sent.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: catalog, error } = await admin
      .from("price_items")
      .select("component_key, display_name, grade, unit, unit_price_cents, catalog_version_id, price_catalog_versions!inner(status)")
      .eq("price_catalog_versions.status", "active");
    if (error) throw new Error(`Catalog read failed: ${error.message}`);

    const rows = (catalog ?? []) as unknown as CatalogRow[];
    if (rows.length === 0) {
      return Response.json(
        { error: "No price catalog is published yet, so nothing can be quoted." },
        { status: 503 },
      );
    }

    // One entry per component, not per grade -- the model picks the grade
    // itself, and listing the same key three times would read as three things.
    const components = Array.from(
      new Map(rows.map((r) => [r.component_key, r.display_name])).entries(),
    ).map(([key, label]) => ({ key, label }));

    let result = await callGemini(MODEL, imageBase64, mimeType ?? "image/jpeg", components);

    const lowest = result.items.reduce((min, i) => Math.min(min, i.confidence ?? 0), 100);
    if (result.items.length > 0 && lowest < CONFIDENCE_GATE) {
      try {
        result = await callGemini(RETRY_MODEL, imageBase64, mimeType ?? "image/jpeg", components);
      } catch {
        // The Flash answer stands; anything under the gate goes to manual
        // review on the client anyway.
      }
    }

    const priced = result.items.flatMap((item) => {
      const row = rows.find(
        (r) => r.component_key === item.componentKey && r.grade === item.grade,
      );
      // A key the catalog has no price for is dropped rather than quoted at
      // zero -- a $0 line reads as "worthless", not "unpriced".
      if (!row) return [];
      return [{
        ...item,
        displayName: row.display_name,
        unit: row.unit,
        unitPriceCents: row.unit_price_cents,
        lineTotalCents: row.unit_price_cents * item.quantity,
        source: "scan" as const,
        catalogVersionId: row.catalog_version_id,
      }];
    });

    return Response.json({
      items: priced,
      totalCents: priced.reduce((sum, i) => sum + i.lineTotalCents, 0),
      catalogVersionId: priced[0]?.catalogVersionId ?? null,
    });
  } catch (e) {
    console.error("appraise failed", e);
    return Response.json(
      { error: "Couldn't read that photo. Try again with more light, or list the items by hand." },
      { status: 502 },
    );
  }
});
