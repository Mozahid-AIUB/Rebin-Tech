// Appraisal scan for the business portal (S35-S37): what a vendor is holding,
// and what Rebin will pay for it.
//
// Same shape as scan-inventory, one decisive difference: the model is told the
// component keys that exist in the live catalog, and the prices are attached
// here from that catalog -- never by the model (plan §6, "AI never prices").
// A rate change is then one row, and every quote can be explained by pointing
// at the catalog version it was priced against.
//
// Grades were removed once pricing moved to weight (catalog v3): every
// component is one row now, priced per pound, so there is nothing left for a
// grade to select. Do not restore it.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "gemini-flash-latest";
const RETRY_MODEL = "gemini-pro-latest";
const CONFIDENCE_GATE = 70;

type CatalogRow = {
  id: string;
  component_key: string;
  display_name: string;
  grade: string;
  unit: string;
  unit_price_cents: number;
  catalog_version_id: string;
  avg_weight_g: number | null;
  // Approximate recoverable content per unit, from the catalog rather than
  // from the model -- see 0040_material_content.sql for why. Display only:
  // nothing below prices from these.
  copper_g: number | null;
  aluminium_g: number | null;
  steel_g: number | null;
  gold_mg: number | null;
};

// Grams per pound. Mirrors create_quote (0034_weight_pricing.sql) exactly, so
// the estimate shown here before a quote is saved matches the total the RPC
// computes when it actually is.
const GRAMS_PER_LB = 453.59237;

function buildPrompt(components: { key: string; label: string }[]): string {
  return `You are appraising a lot of used electronics a recycler has been offered.

Identify each distinct kind of item and how many of it you can see. Use only
these component keys:

${components.map((c) => `- ${c.key}: ${c.label}`).join("\n")}

For each line give:
- componentKey: one of the keys above
- quantity: how many of that key are visible
- confidence: 0-100
- notes: a short phrase describing the item -- what it is, its condition,
  anything relevant you actually saw

Never state a price; you are not pricing this. If an item does not match any
key above, leave it out rather than forcing it into the closest one.`;
}

// Groq's vision model, used only when Gemini will not answer at all. See the
// note in scan-inventory: Gemini's free tier queues paid callers first, so a
// free key gets 503 in bursts, and Groq is a separate queue that fails
// independently. Second rather than first because Gemini reads a label better.
const GROQ_MODEL = "qwen/qwen3.6-27b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Pulls the JSON object out of a reasoning model's reply.
 *
 * Qwen thinks out loud before answering: the response opens with a <think>
 * block of several hundred words weighing what it can see, and the JSON comes
 * after it, usually inside a ```json fence. Groq's own `json_object` mode
 * rejects that shape outright -- it returns 400 json_validate_failed with an
 * empty failed_generation -- so the mode is not used and the object is taken
 * from the text instead.
 *
 * Deliberately not a regex over the whole string: braces appear inside the
 * reasoning too. This finds the first `{` after any think block or fence and
 * matches to its balanced close.
 */
function extractJson(text: string): string {
  const afterThink = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const fenced = afterThink.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : afterThink;

  const start = body.indexOf("{");
  if (start === -1) throw new Error("No JSON object in the reply");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return body.slice(start, i + 1);
  }
  throw new Error("Unterminated JSON object in the reply");
}

/**
 * The same appraisal, asked of Groq.
 *
 * Groq has no responseSchema, and its `json_object` mode cannot survive this
 * model's reasoning preamble (see extractJson), so the shape goes in the
 * prompt and the result is filtered hard here. The component key filter is
 * the important one: a key the catalog does not have would be priced at
 * nothing downstream, and a hallucinated key must never reach a quote.
 */
async function callGroq(
  imageBase64: string,
  mimeType: string,
  components: { key: string; label: string }[],
) {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY is not set");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      // Qwen is a reasoning model: left to itself it writes several hundred
      // words weighing what it can see, hits the token ceiling mid-JSON, and
      // returns finish_reason "length" with an object that cannot be parsed.
      // Turning reasoning off gives clean JSON in ~1s instead. Verified
      // against the live API -- "none" and "default" are the only accepted
      // values; "low" is rejected with a 400.
      reasoning_effort: "none",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${buildPrompt(components)}

End your reply with the JSON object and nothing after it, in exactly this shape:
{"items":[{"componentKey":"${components[0]?.key ?? "example_key"}","quantity":3,"confidence":90,"notes":"three tower cases, dusty"}]}

componentKey must be one of the keys listed above. quantity and confidence
are whole numbers. notes is a short string or null. Return {"items":[]} if
nothing in the photo matches a key.`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
    }),
  });

  // Groq's free tier allows 8000 tokens a minute and one image costs several
  // thousand, so two scans in quick succession hit 429 even though nothing is
  // wrong. Worth saying plainly in the log: this is a quota, not a fault.
  if (res.status === 429) {
    throw new Error(`Groq rate limit (free tier is 8000 tokens/min): ${await res.text()}`);
  }
  if (!res.ok) throw new Error(`Groq returned ${res.status}: ${await res.text()}`);

  const body = await res.json();
  const text = body?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content");

  const parsed = JSON.parse(extractJson(text)) as { items?: unknown };
  const rows = Array.isArray(parsed.items) ? parsed.items : [];
  const known = new Set(components.map((c) => c.key));

  const items = rows.flatMap((row) => {
    const r = row as Record<string, unknown>;
    if (typeof r?.componentKey !== "string" || !known.has(r.componentKey)) return [];
    const quantity = Number(r.quantity);
    const confidence = Number(r.confidence);
    if (!Number.isFinite(quantity) || quantity <= 0) return [];
    return [{
      componentKey: r.componentKey,
      quantity: Math.round(quantity),
      confidence: Number.isFinite(confidence) ? Math.round(confidence) : 0,
      notes: typeof r.notes === "string" ? r.notes : null,
    }];
  });

  return { items };
}

/**
 * Retries a Gemini call that failed because the model was busy.
 *
 * 503 UNAVAILABLE ("this model is currently experiencing high demand") and 429
 * are Google telling us to come back, not that anything is wrong with the
 * request -- the identical call succeeds seconds later. Without this a vendor
 * photographing a pallet is told the photo was unreadable when it was fine.
 *
 * Stays on the model it was given -- sending the last attempt to Pro was
 * tried and measured, and made things worse. See the note in scan-inventory.
 *
 * Mirrors scan-inventory exactly, deliberately: the two functions fail the
 * same way against the same API, and a vendor hitting one spike should not
 * get different behaviour depending on which screen they were on.
 */
const BUSY_STATUSES = new Set([429, 503]);
const RETRY_DELAYS_MS = [600, 1200];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Gemini was reachable but asked us to come back -- 429 or 503. */
class GeminiBusyError extends Error {
  constructor(status: number, body: string) {
    super(`Gemini returned ${status}: ${body}`);
    this.name = "GeminiBusyError";
  }
}

async function callGeminiWithRetry(
  model: string,
  imageBase64: string,
  mimeType: string,
  components: { key: string; label: string }[],
) {
  const attempts = RETRY_DELAYS_MS.length;
  let lastError: unknown;

  for (let attempt = 0; attempt <= attempts; attempt++) {
    try {
      return await callGemini(model, imageBase64, mimeType, components);
    } catch (e) {
      lastError = e;
      if (!(e instanceof GeminiBusyError) || attempt === attempts) throw e;
      console.warn(`Gemini busy on ${model} (attempt ${attempt + 1}), retrying`);
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
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
                    quantity: { type: "integer" },
                    confidence: { type: "integer" },
                    notes: { type: "string", nullable: true },
                  },
                  required: ["componentKey", "quantity", "confidence", "notes"],
                },
              },
            },
            required: ["items"],
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    // Busy is worth another go; a 400 for a malformed request is not.
    if (BUSY_STATUSES.has(res.status)) throw new GeminiBusyError(res.status, body);
    throw new Error(`Gemini returned ${res.status}: ${body}`);
  }
  const body = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text) as {
    items: { componentKey: string; quantity: number; confidence: number; notes: string | null }[];
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) {
      return Response.json({ error: "No image supplied" }, { status: 400, headers: corsHeaders });
    }

    // Service role, because the catalog read has to succeed for an anonymous
    // browse too, and because the prices attached below must come from the
    // live catalog rather than from anything the caller sent.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: catalog, error } = await admin
      .from("price_items")
      .select(
        "id, component_key, display_name, grade, unit, unit_price_cents, catalog_version_id, avg_weight_g, copper_g, aluminium_g, steel_g, gold_mg, price_catalog_versions!inner(status)",
      )
      .eq("price_catalog_versions.status", "active");
    if (error) throw new Error(`Catalog read failed: ${error.message}`);

    const rows = (catalog ?? []) as unknown as CatalogRow[];
    if (rows.length === 0) {
      return Response.json(
        { error: "No price catalog is published yet, so nothing can be quoted." },
        { status: 503, headers: corsHeaders },
      );
    }

    // One entry per component -- catalog v3 has exactly one row per
    // component_key (every row is "parts"), so this also de-dupes nothing
    // that wasn't already unique.
    const components = Array.from(
      new Map(rows.map((r) => [r.component_key, r.display_name])).entries(),
    ).map(([key, label]) => ({ key, label }));

    const mime = mimeType ?? "image/jpeg";

    let result;
    try {
      result = await callGeminiWithRetry(MODEL, imageBase64, mime, components);
    } catch (e) {
      // Only when Gemini would not answer at all. A 400 means the request
      // itself is wrong and Groq would reject it too, so that still fails.
      if (!(e instanceof GeminiBusyError)) throw e;
      console.warn("Gemini unavailable after retries; falling back to Groq");
      result = await callGroq(imageBase64, mime, components);
    }

    const lowest = result.items.reduce((min, i) => Math.min(min, i.confidence ?? 0), 100);
    if (result.items.length > 0 && lowest < CONFIDENCE_GATE) {
      try {
        result = await callGeminiWithRetry(RETRY_MODEL, imageBase64, mime, components);
      } catch {
        // The Flash answer stands; anything under the gate goes to manual
        // review on the client anyway.
      }
    }

    const priced = result.items.flatMap((item) => {
      // `rows` comes back from PostgREST in whatever order Postgres happens
      // to return them, which is not a guarantee -- catalog v3 has one row
      // per component_key today, but 0035 shipped believing exactly that and
      // was wrong: the draft it published still carried v2's graded
      // duplicates (0036), because of the same draft-copy bug 0037 fixes.
      // If duplicates ever recur, `.find` on an unordered result would let
      // the same photo quote two different prices depending on what Postgres
      // felt like returning first. Preferring the weight-priced row (the
      // pricing model the catalog is meant to carry now) and breaking any
      // further tie on the row's own id -- stable and unique, unlike
      // catalog_version_id which is identical across every row this query
      // can return -- removes the non-determinism without assuming
      // duplicates can't happen again.
      const candidates = rows.filter((r) => r.component_key === item.componentKey);
      const row = candidates
        .slice()
        .sort((a, b) => {
          const weighted = Number(b.avg_weight_g != null) - Number(a.avg_weight_g != null);
          if (weighted !== 0) return weighted;
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        })[0];
      // A key the catalog has no price for is dropped rather than quoted at
      // zero -- a $0 line reads as "worthless", not "unpriced".
      if (!row) return [];
      // grade travels with the row, the same as the price -- the model was
      // never asked for one (see the header comment), and create_quote still
      // needs it to find this row again.
      const weightG = row.avg_weight_g != null ? row.avg_weight_g * item.quantity : null;
      const lineTotalCents =
        weightG != null
          ? Math.round((row.unit_price_cents * weightG) / GRAMS_PER_LB)
          : row.unit_price_cents * item.quantity;
      return [{
        ...item,
        displayName: row.display_name,
        grade: row.grade,
        unit: row.unit,
        unitPriceCents: row.unit_price_cents,
        avgWeightG: row.avg_weight_g,
        weightG,
        lineTotalCents,
        source: "scan" as const,
        catalogVersionId: row.catalog_version_id,
        // Scaled by quantity like the weight is, so three laptops read as
        // three laptops' worth of copper. Null when the catalog has no figure
        // for this component -- the client then shows nothing rather than a
        // zero, which would read as "contains no copper" instead of "not
        // recorded".
        material: {
          copperG: row.copper_g != null ? row.copper_g * item.quantity : null,
          aluminiumG: row.aluminium_g != null ? row.aluminium_g * item.quantity : null,
          steelG: row.steel_g != null ? row.steel_g * item.quantity : null,
          goldMg: row.gold_mg != null ? row.gold_mg * item.quantity : null,
        },
      }];
    });

    return Response.json(
      {
        items: priced,
        totalCents: priced.reduce((sum, i) => sum + i.lineTotalCents, 0),
        catalogVersionId: priced[0]?.catalogVersionId ?? null,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error("appraise failed", e);
    return Response.json(
      { error: "Couldn't read that photo. Try again with more light, or list the items by hand." },
      { status: 502, headers: corsHeaders },
    );
  }
});
