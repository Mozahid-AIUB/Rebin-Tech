import type { AgentSignupInput, BusinessSignupInput, OrgSignupInput, Role, ScopeType } from "@rebin/shared";
import type { PortalKey } from "@rebin/shared";
import { supabase } from "./client";

export type RoleAssignment = {
  role: Role;
  scopeType: ScopeType;
  scopeId: string | null;
  scopeName: string | null;
};

/**
 * Thrown when the role lookup could not reach the server, as opposed to
 * reaching it and being told the account has no roles.
 *
 * The distinction decides whether a caller signs the user out. An account
 * with no roles has no portal to open, so signing out is right; a phone that
 * lost signal for a second still has a perfectly valid session, and throwing
 * it away means logging in again on the next platform of a train. The two
 * are indistinguishable from a rejected promise alone -- hence this type.
 */
export class RolesUnreachableError extends Error {
  constructor(cause: string) {
    super(`Could not reach the server to load roles: ${cause}`);
    this.name = "RolesUnreachableError";
  }
}

/**
 * Whether a PostgREST failure was the network rather than the database.
 *
 * supabase-js surfaces a fetch failure as a PostgrestError with an empty
 * `code` and a TypeError-ish message, because there was no HTTP response to
 * read a code from. A real database refusal always carries a SQLSTATE -- an
 * RLS denial is 42501, a missing relationship PGRST200. So: no code means
 * nothing answered.
 */
function isUnreachable(error: { code?: string | null; message?: string | null }): boolean {
  if (error.code) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("connection")
  );
}

const PORTAL_BY_ROLE: Partial<Record<Role, PortalKey>> = {
  org_owner: "org", org_admin: "org", org_requester: "org",
  biz_owner: "business", biz_staff: "business",
};

// field_agent and field_lead map to no portal on purpose. Agents work from
// the operations console now, not from this app, so an agent-only account
// has nothing to open here and resolveInitialRoute sends it to /pending.

export function portalForRole(role: Role): PortalKey | null {
  return PORTAL_BY_ROLE[role] ?? null;
}

export async function signIn(email: string, password: string): Promise<{ userId: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Sign-in returned no user");
  return { userId: data.user.id };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Loads the caller's active role assignments, with the human-readable name of
 * whatever each one is scoped to.
 *
 * The scope name is fetched in a second pass rather than embedded in the first
 * query. `role_assignments.scope_id` is polymorphic -- it points at an
 * organization, a business, or nothing at all for a self-scoped agent -- so it
 * has no foreign key, and PostgREST can only embed across a real FK. Asking it
 * for `organizations(name)` failed the whole query with PGRST200 ("Could not
 * find a relationship"), which surfaced as a login that always failed.
 */
export async function resolveRoles(userId: string): Promise<RoleAssignment[]> {
  const { data, error } = await supabase
    .from("role_assignments")
    .select("role, scope_type, scope_id")
    .eq("user_id", userId)
    .is("revoked_at", null);
  // PostgrestError is a plain object, not an Error subclass: rethrowing it as
  // -is meant every caller's `e instanceof Error` check missed and the real
  // message was replaced by a generic one. Wrapping keeps the cause visible.
  //
  // Unreachable is its own type so the caller can keep the session instead of
  // signing out -- see RolesUnreachableError.
  if (error) {
    if (isUnreachable(error)) throw new RolesUnreachableError(error.message);
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const idsFor = (scope: ScopeType) =>
    rows.filter((r) => r.scope_type === scope && r.scope_id).map((r) => r.scope_id as string);

  const orgIds = idsFor("organization");
  const bizIds = idsFor("business");

  const [orgNames, bizNames] = await Promise.all([
    fetchNames("organizations", orgIds),
    fetchNames("businesses", bizIds),
  ]);

  return rows.map((row) => ({
    role: row.role as Role,
    scopeType: row.scope_type as ScopeType,
    scopeId: row.scope_id,
    scopeName: row.scope_id
      ? (row.scope_type === "organization" ? orgNames : bizNames)[row.scope_id] ?? null
      : null,
  }));
}

/** id -> name for one tenant table. Returns empty (never throws) for no ids. */
async function fetchNames(table: "organizations" | "businesses", ids: string[]) {
  if (ids.length === 0) return {};
  const { data, error } = await supabase.from(table).select("id, name").in("id", ids);
  // A missing name is cosmetic -- it degrades the portal switcher's label, not
  // the user's access -- so this must never be what blocks a login.
  if (error) return {};
  return Object.fromEntries((data ?? []).map((r) => [r.id as string, r.name as string]));
}

// Organization signup goes through an Edge Function because it must create the
// auth user, the `organizations` row, the `organization_members` row, and the
// `role_assignments` row in one transaction. Doing it client-side leaves
// orphaned users when a later step fails.
export async function signUpOrganization(input: OrgSignupInput): Promise<{ userId: string; orgId: string }> {
  const { data, error } = await supabase.functions.invoke<{ userId: string; orgId: string }>(
    "signup-organization",
    { body: input },
  );
  if (error) throw error;
  if (!data) throw new Error("Signup returned no payload");
  return data;
}

// Same Edge Function pattern and same reason as signUpOrganization above:
// user + tenant + membership + role assignment must land together.
export async function signUpBusiness(input: BusinessSignupInput): Promise<{ userId: string; businessId: string }> {
  const { data, error } = await supabase.functions.invoke<{ userId: string; businessId: string }>(
    "signup-business",
    { body: input },
  );
  if (error) throw error;
  if (!data) throw new Error("Signup returned no payload");
  return data;
}

// An agent creates no tenant, so there's no entity id to hand back -- but the
// profile, agent_profiles row and role assignment still have to be atomic, so
// it goes through an Edge Function like the other two rather than being
// assembled from client-side inserts.
export async function signUpAgent(input: AgentSignupInput): Promise<{ userId: string }> {
  const { data, error } = await supabase.functions.invoke<{ userId: string }>(
    "signup-agent",
    { body: input },
  );
  if (error) throw error;
  if (!data) throw new Error("Signup returned no payload");
  return data;
}
