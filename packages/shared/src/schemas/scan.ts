import { z } from "zod";
import { DEVICE_CATEGORIES } from "../enums";

/**
 * One device the camera identified.
 *
 * Everything but the category and confidence is nullable on purpose: a photo
 * taken from across a storeroom yields "that's a monitor" and nothing more.
 * Requiring a make and serial would push the most common real shot into manual
 * entry, which is the flow the camera exists to avoid.
 */
export const scanItemSchema = z.object({
  deviceCategory: z.enum(DEVICE_CATEGORIES),
  make: z.string().nullable(),
  model: z.string().nullable(),
  /**
   * Serial or asset tag, when one is legible. This is what makes the result a
   * compliance record rather than a count -- a hospital has to be able to say
   * which drive was destroyed, not how many.
   */
  serial: z.string().nullable(),
  confidence: z.number().min(0).max(100),
});

export const scanResultSchema = z.object({
  items: z.array(scanItemSchema),
});

export type ScanItem = z.infer<typeof scanItemSchema>;
export type ScanResult = z.infer<typeof scanResultSchema>;

export type ScanDisposition = "auto" | "review" | "manual";

/**
 * What to do with a scan at a given confidence (plan §6).
 *
 * One function rather than a threshold typed out at each call site: the
 * organization's inventory scan and the field agent's scanner have to agree on
 * where "certain enough" sits, and two copies of `>= 90` drift.
 */
export function scanDisposition(confidence: number): ScanDisposition {
  if (confidence >= 90) return "auto";
  if (confidence >= 70) return "review";
  return "manual";
}
