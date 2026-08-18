"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AccountStatus, RequestStatus } from "@/lib/supabase/types";

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
      return "That move is not allowed from the current status. Reload to see where the request is now.";
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/admin");
}
