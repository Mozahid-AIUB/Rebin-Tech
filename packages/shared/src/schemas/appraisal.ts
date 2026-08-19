import { z } from "zod";

export const PRICE_GRADES = ["working", "broken", "parts"] as const;
export type PriceGrade = (typeof PRICE_GRADES)[number];

export const PRICE_UNITS = ["each", "lb"] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

/**
 * One lot the appraisal camera identified.
 *
 * Note what is missing: a price. The model classifies and the catalog prices
 * (plan §6), so a rate change is a row rather than a retrain, and every quote
 * can be explained by pointing at the catalog version it came from. `.strip()`
 * is the default, so a price the model volunteers anyway is dropped here
 * rather than reaching a quote.
 */
export const appraisalItemSchema = z.object({
  /** Must be a component_key that exists in the live catalog. */
  componentKey: z.string().min(1),
  quantity: z.number().int().min(1),
  confidence: z.number().min(0).max(100),
  /** What the model saw -- shown to the vendor alongside the item. */
  notes: z.string().nullable().default(null),
});

export const appraisalResultSchema = z.object({
  items: z.array(appraisalItemSchema),
});

export type AppraisalItem = z.infer<typeof appraisalItemSchema>;
export type AppraisalResult = z.infer<typeof appraisalResultSchema>;

/**
 * Money stays in integer cents from the catalog to the payout.
 *
 * Floats would drift: 0.1 + 0.2 is not 0.3, and a quote that disagrees with
 * the payout by a cent is a support ticket every time.
 */
export function lineTotalCents(unitPriceCents: number, quantity: number): number {
  return unitPriceCents * quantity;
}

export function quoteTotalCents(
  lines: readonly { unitPriceCents: number; quantity: number }[],
): number {
  return lines.reduce((sum, line) => sum + lineTotalCents(line.unitPriceCents, line.quantity), 0);
}
