import type { DeviceCategory, PriceGrade, PriceUnit } from "./supabase/types";

/**
 * The catalog's fixed vocabularies, mirrored from 0021 and 0028.
 *
 * Same reasoning as `transitions.ts`: the database is the authority, and
 * `set_price_item` re-checks every value against these enums on its own. What
 * this buys is an editor whose dropdowns only ever offer values the RPC will
 * accept, rather than free text that fails after a round trip.
 */
export const DEVICE_CATEGORIES: DeviceCategory[] = [
  "computers_laptops",
  "monitors_displays",
  "server_gear",
  "copiers_printers",
  "batteries_ups",
  "components_parts",
];

export const CATEGORY_LABEL: Record<DeviceCategory, string> = {
  computers_laptops: "Computers & laptops",
  monitors_displays: "Monitors & displays",
  server_gear: "Server gear",
  copiers_printers: "Copiers & printers",
  batteries_ups: "Batteries & UPS",
  components_parts: "Components & parts",
};

export const PRICE_GRADES: PriceGrade[] = ["working", "broken", "parts"];

export const GRADE_LABEL: Record<PriceGrade, string> = {
  working: "Working",
  broken: "Broken",
  parts: "Parts",
};

export const PRICE_UNITS: PriceUnit[] = ["each", "lb"];

export const UNIT_LABEL: Record<PriceUnit, string> = {
  each: "Each",
  lb: "Per lb",
};

/** `1234.56` -> `$1,234.56`. Display only -- never parsed back from this string. */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/**
 * A dollar-and-cents string from an editor field -> integer cents.
 *
 * Returns null for anything that is not a non-negative amount, so the caller
 * can reject client-side before the RPC's own check constraint would. Money
 * never round-trips through a formatted string: this only ever reads what the
 * operator typed, not `formatCents`'s output.
 */
export function parseDollarsToCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "" || !/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [dollars, fraction = ""] = trimmed.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}
