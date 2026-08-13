/**
 * Comparing what a collection agreed to buy against what came off the dock.
 *
 * The database is the authority here -- `advance_job` recomputes the same
 * comparison server-side and flags the job, and nothing the phone sends can
 * talk it out of that. This exists so the agent finds out while they are still
 * standing in front of the stock, which is the last moment the gap can be
 * settled by asking rather than by a phone call a week later.
 */

/** What the quote agreed to buy, across all its lines. */
export function expectedUnits(items: readonly { quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export type CountGap = { direction: "short" | "over"; by: number };

/**
 * The discrepancy worth mentioning, or null when there is none to mention.
 *
 * Returns null for a free pickup (nothing was agreed, so nothing is owed) and
 * for a count that is not yet a number -- this runs on every keystroke, and
 * "1" on the way to "10" is not a discrepancy.
 */
export function countGap(expected: number | null, actual: number | null): CountGap | null {
  if (expected === null || expected <= 0) return null;
  if (actual === null || !Number.isFinite(actual)) return null;
  if (actual === expected) return null;
  return actual < expected
    ? { direction: "short", by: expected - actual }
    : { direction: "over", by: actual - expected };
}
