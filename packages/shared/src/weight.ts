import { formatCents } from "./money";

export const GRAMS_PER_LB = 453.59237;

export function gramsToLbs(grams: number): number {
  return Math.round((grams / GRAMS_PER_LB) * 10) / 10;
}

export function lbsToGrams(lbs: number): number {
  return Math.round(lbs * GRAMS_PER_LB);
}

export function formatWeight(grams: number): string {
  return `${gramsToLbs(grams).toFixed(1)} lbs`;
}

/**
 * A weight-priced quote line, rendered so a supplier can check it with a
 * pocket calculator and land on the same number Rebin did.
 *
 * `formatWeight` rounds to one decimal place -- it is a *display* formatter,
 * not an arithmetic one. Feeding a per-unit weight and a total weight through
 * it independently breaks the one property this string exists to prove:
 * `quantity x per-unit == total`. Rounding two lbs figures separately cannot
 * be made to satisfy that identity for arbitrary quantities (12 x 0.1 is
 * 1.2, not the 1.3 that two independent roundings can produce) -- more
 * decimal places on each side narrows the gap but never closes it for every
 * quantity.
 *
 * The fix is to never round the two sides independently. Grams are integers
 * already, so `quantity x per-unit-grams == total-grams` holds exactly with
 * no rounding at all; that is the reconciling arithmetic. The pounds figure
 * in parentheses is a single value derived from the (exact) total grams, at
 * enough precision that `lbs x rate` lands within a cent of the price shown
 * -- it is a convenience for someone thinking in pounds, not a second
 * quantity the multiplication has to agree with.
 */
export function lineArithmetic(line: {
  quantity: number;
  unitPriceCents: number;
  weightG: number | null;
}): string {
  if (line.weightG == null) {
    return `${line.quantity} × ${formatCents(line.unitPriceCents)}`;
  }
  const perUnitG = line.weightG / line.quantity;
  const totalLbs = (line.weightG / GRAMS_PER_LB).toFixed(3);
  return (
    `${line.quantity} × ${Math.round(perUnitG)}g = ${line.weightG}g (${totalLbs} lb) ` +
    `at ${formatCents(line.unitPriceCents)}/lb`
  );
}
