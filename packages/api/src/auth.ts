import type { OrgSignupInput, Role, ScopeType } from "@rebin/shared";
import type { PortalKey } from "@rebin/ui";
import { supabase } from "./client";

export type RoleAssignment = {
  role: Role;
  scopeType: ScopeType;
  scopeId: string | null;
  scopeName: string | null;
};

const PORTAL_BY_ROLE: Partial<Record<Role, PortalKey>> = {
  org_owner: "org", org_admin: "org", org_requester: "org",
  biz_owner: "business", biz_staff: "business",
  field_agent: "agent", field_lead: "agent",
};

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

export async function resolveRoles(userId: string): Promise<RoleAssignment[]> {
  const { data, error } = await supabase
    .from("role_assignments")
    .select("role, scope_type, scope_id, organizations(name)")
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    role: row.role as Role,
    scopeType: row.scope_type as ScopeType,
    scopeId: row.scope_id,
    scopeName: (row.organizations as unknown as { name: string } | null)?.name ?? null,
  }));
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
