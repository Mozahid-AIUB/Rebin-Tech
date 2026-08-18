import type { QuoteStatus } from "./supabase/types";

/**
 * A lapsed offer, reported as lapsed.
 *
 * This is a copy of the rule `list_quotes` applies in 0023_quotes.sql: an
 * `offered` quote whose `expires_at` has passed reads as `expired` whether or
 * not a write has caught up. `list_quotes` itself takes a `p_business_id` and
 * this console is cross-business, so it cannot be called here -- but the read
 * it protects against is the same one: a list that still says "offered"
 * invites a tap (or, here, an operator's answer to a vendor) that the
 * database would refuse.
 *
 * Every place this screen displays a quote's status must go through this
 * function rather than reading the `status` column directly.
 */
export function effectiveQuoteStatus(status: QuoteStatus, expiresAt: string): QuoteStatus {
  if (status === "offered" && new Date(expiresAt).getTime() <= Date.now()) {
    return "expired";
  }
  return status;
}
