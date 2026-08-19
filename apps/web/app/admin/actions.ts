"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  AccountStatus,
  DeviceCategory,
  PriceGrade,
  PriceUnit,
  RequestStatus,
} from "@/lib/supabase/types";

/**
 * Every mutation the console can perform, each one a single RPC call.
 *
 * These run on the server with the operator's own session, never a
 * service-role key. That is what keeps the authorisation check meaningful:
 * each function below reaches a `security definer` RPC that calls
 * `is_platform_staff()` before it touches a row, so a caller without the role
 * gets 42501 no matter where the call came from. Bypassing RLS here would
 * move that decision into this file, which is exactly the wrong place for it.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * Postgres error codes the RPCs raise deliberately, turned into sentences an
 * operator can act on. Anything else is unexpected and shown verbatim --
 * inventing friendly copy for an unknown failure hides what went wrong.
 */
function explain(code: string | undefined, fallback: string): string {
  switch (code) {
    case "42501":
      return "Your account is not permitted to do that.";
    case "22023":
      return "That's not allowed right now. Reload the page to see the current state before trying again.";
    case "P0002":
      return "That record no longer exists.";
    default:
      return fallback;
  }
}

export async function advanceRequest(
  requestId: string,
  status: RequestStatus,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("advance_pickup_request", {
    p_request_id: requestId,
    p_status: status,
  });

  if (error) {
    return { ok: false, message: explain(error.code, error.message) };
  }

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function cancelRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Not `advance_pickup_request(..., 'cancelled')`: cancelling has its own RPC
  // with its own rule -- allowed from pending, under_review and scheduled, and
  // refused once an agent is on the way.
  const { error } = await supabase.rpc("cancel_pickup_request", {
    p_request_id: requestId,
  });

  if (error) {
    return { ok: false, message: explain(error.code, error.message) };
  }

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Approve or reject a pending account.
 *
 * Which RPC to call depends on what the account is: an organization and a
 * business each have a row to move, while an agent is a person, so the
 * profile itself is the account. The `pending_accounts` view hands back the
 * `kind` that decides this.
 */
export async function setAccountStatus(
  kind: string,
  id: string,
  status: AccountStatus,
): Promise<ActionResult> {
  const supabase = await createClient();

  const call =
    kind === "organization"
      ? supabase.rpc("set_organization_status", { p_org_id: id, p_status: status })
      : kind === "business"
        ? supabase.rpc("set_business_status", { p_business_id: id, p_status: status })
        : kind === "agent"
          ? supabase.rpc("set_agent_status", { p_user_id: id, p_status: status })
          : null;

  if (!call) {
    return { ok: false, message: `Unknown account type: ${kind}` };
  }

  const { error } = await call;

  if (error) {
    return { ok: false, message: explain(error.code, error.message) };
  }

  revalidatePath("/admin/accounts");
  revalidatePath("/admin");
  return { ok: true };
}

export type PriceDraftResult = { ok: true; versionId: string } | { ok: false; message: string };

/**
 * Starts a new draft, seeded from whatever is active.
 *
 * Returns the new version's id rather than nothing: the screen needs it to
 * switch the selected version to the draft it just created, and re-querying
 * for "the newest draft" would be guessing at what this call just did.
 */
export async function createPriceDraft(note: string | null): Promise<PriceDraftResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_price_catalog_draft", {
    p_note: note ?? undefined,
  });

  if (error) {
    return { ok: false, message: explain(error.code, error.message) };
  }

  revalidatePath("/admin/prices");
  return { ok: true, versionId: data };
}

/** Upserts one row of a draft. Rejected by the RPC itself for any other status. */
export async function setPriceItem(input: {
  versionId: string;
  componentKey: string;
  displayName: string;
  category: DeviceCategory;
  grade: PriceGrade;
  unit: PriceUnit;
  unitPriceCents: number;
  avgWeightG: number | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  // `p_avg_weight_g` (0034_weight_pricing.sql) isn't in packages/api's
  // generated types yet -- the CLI can't reach the live database to
  // regenerate them here. The RPC itself already accepts the argument; the
  // `as any` below only works around the stale local type, not the database.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)("set_price_item", {
    p_version_id: input.versionId,
    p_component_key: input.componentKey,
    p_display_name: input.displayName,
    p_category: input.category,
    p_grade: input.grade,
    p_unit: input.unit,
    p_unit_price_cents: input.unitPriceCents,
    p_avg_weight_g: input.avgWeightG,
  });

  if (error) {
    return { ok: false, message: explain(error.code, error.message) };
  }

  revalidatePath("/admin/prices");
  return { ok: true };
}

/**
 * Makes a draft the live catalog. Not reversible except by publishing another
 * version -- the confirmation dialog in front of this call is the one modal
 * in the console, for exactly that reason.
 */
export async function publishPriceCatalog(versionId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("publish_price_catalog", {
    p_version_id: versionId,
  });

  if (error) {
    return { ok: false, message: explain(error.code, error.message) };
  }

  revalidatePath("/admin/prices");
  return { ok: true };
}

/**
 * Payout, in three steps an operator takes on three different days.
 *
 * Each is one RPC gated on is_platform_staff(), like every other write here.
 * Nothing in this file moves money -- the transfer happens at a bank, and
 * these record that it did.
 */
export async function recordConsignmentReceived(
  quoteId: string,
  notes: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_consignment_received" as never, {
    p_quote_id: quoteId,
    p_notes: notes ?? undefined,
  } as never);
  if (error) return { ok: false, message: explain(error.code, error.message) };
  revalidatePath("/admin/payouts");
  revalidatePath("/admin");
  return { ok: true };
}

export async function recordConsignmentWeighed(input: {
  quoteId: string;
  actualWeightG: number;
  finalCents: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_consignment_weighed" as never, {
    p_quote_id: input.quoteId,
    p_actual_weight_g: input.actualWeightG,
    p_final_cents: input.finalCents,
  } as never);
  if (error) return { ok: false, message: explain(error.code, error.message) };
  revalidatePath("/admin/payouts");
  return { ok: true };
}

export async function recordPayoutPaid(
  quoteId: string,
  reference: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_payout_paid" as never, {
    p_quote_id: quoteId,
    p_reference: reference ?? undefined,
  } as never);
  if (error) return { ok: false, message: explain(error.code, error.message) };
  revalidatePath("/admin/payouts");
  revalidatePath("/admin");
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/admin");
}
