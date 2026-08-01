import type { AccountStatus, RequestStatus } from "@rebin/shared";
import { supabase } from "./client";

export type OrgSummary = {
  id: string;
  name: string;
  status: AccountStatus;
};

export type PickupRequestRow = {
  id: string;
  status: RequestStatus;
  unitCount: number;
  windowStart: string;
  createdAt: string;
};

/**
 * Reads follow the same shape as resolveRoles: errors are rethrown as real
 * `Error`s. PostgREST hands back a plain object, and rethrowing it as-is makes
 * every `e instanceof Error` check downstream miss, replacing the real cause
 * with a generic message -- exactly the bug that made login failures
 * undiagnosable.
 */
function asError(message: string): Error {
  return new Error(message);
}

export type BusinessSummary = {
  id: string;
  name: string;
  status: AccountStatus;
};

export type AgentProfile = {
  serviceCity: string;
  serviceState: string;
  vehicle: string;
};

/** Everything the signed-in user typed about themselves at registration. */
export type ProfileDetail = {
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: AccountStatus;
};

/** A US postal address, as captured by every signup flow that has one. */
export type PostalAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export type OrgDetail = OrgSummary & {
  orgType: string;
  address: PostalAddress;
  dockAccess: boolean;
};

export type BusinessDetail = BusinessSummary & {
  businessType: string;
  ein: string | null;
  address: PostalAddress;
};

export type AgentDetail = AgentProfile & {
  serviceZip: string;
  hasDriversLicense: boolean;
};

/** The signed-in user's own display name, for the dashboard greeting. */
export async function getProfileName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw asError(error.message);
  return data?.full_name ?? null;
}

/**
 * The full profile row, for the Me screen.
 *
 * getProfileName above stays as the narrower read the dashboards use -- their
 * greeting needs one column, and asking for the whole row there would fetch a
 * phone number nothing renders.
 */
export async function getProfileDetail(userId: string): Promise<ProfileDetail | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, phone, avatar_url, status")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw asError(error.message);
  if (!data) return null;
  return {
    fullName: data.full_name ?? null,
    phone: data.phone ?? null,
    avatarUrl: data.avatar_url ?? null,
    status: data.status as AccountStatus,
  };
}

export async function getOrganizationDetail(orgId: string): Promise<OrgDetail | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, status, org_type, street, city, state, zip, dock_access")
    .eq("id", orgId)
    .maybeSingle();
  if (error) throw asError(error.message);
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    status: data.status as AccountStatus,
    orgType: data.org_type as string,
    address: { street: data.street, city: data.city, state: data.state, zip: data.zip },
    dockAccess: data.dock_access,
  };
}

export async function getBusinessDetail(businessId: string): Promise<BusinessDetail | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, status, business_type, ein, street, city, state, zip")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw asError(error.message);
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    status: data.status as AccountStatus,
    businessType: data.business_type as string,
    ein: data.ein ?? null,
    address: { street: data.street, city: data.city, state: data.state, zip: data.zip },
  };
}

export async function getAgentDetail(userId: string): Promise<AgentDetail | null> {
  const { data, error } = await supabase
    .from("agent_profiles")
    .select("service_city, service_state, service_zip, vehicle, has_drivers_license")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw asError(error.message);
  if (!data) return null;
  return {
    serviceCity: data.service_city,
    serviceState: data.service_state,
    serviceZip: data.service_zip,
    vehicle: data.vehicle as string,
    hasDriversLicense: data.has_drivers_license,
  };
}

export async function getOrganization(orgId: string): Promise<OrgSummary | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, status")
    .eq("id", orgId)
    .maybeSingle();
  if (error) throw asError(error.message);
  if (!data) return null;
  return { id: data.id, name: data.name, status: data.status as AccountStatus };
}

/**
 * Most recent pickup requests for one organization.
 *
 * Ordered by created_at desc to match the `pickup_requests_org_idx` index
 * (org_id, created_at desc) rather than fighting it.
 */
export async function listRecentPickupRequests(
  orgId: string,
  limit = 5,
): Promise<PickupRequestRow[]> {
  const { data, error } = await supabase
    .from("pickup_requests")
    .select("id, status, unit_count, window_start, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw asError(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status as RequestStatus,
    unitCount: row.unit_count,
    windowStart: row.window_start,
    createdAt: row.created_at,
  }));
}

export async function getBusiness(businessId: string): Promise<BusinessSummary | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, status")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw asError(error.message);
  if (!data) return null;
  return { id: data.id, name: data.name, status: data.status as AccountStatus };
}

/**
 * An agent's own service area and vehicle.
 *
 * Keyed by user id, not a tenant id: an agent is a person with a self-scoped
 * role assignment, so there is no entity to look up (see agent_profiles in
 * migration 0011).
 */
export async function getAgentProfile(userId: string): Promise<AgentProfile | null> {
  const { data, error } = await supabase
    .from("agent_profiles")
    .select("service_city, service_state, vehicle")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw asError(error.message);
  if (!data) return null;
  return {
    serviceCity: data.service_city,
    serviceState: data.service_state,
    vehicle: data.vehicle as string,
  };
}

/**
 * Updates the signed-in user's own name, phone and avatar.
 *
 * Goes through the `update_own_profile` RPC rather than a table update: see
 * migration 0013 for why (a plain RLS update policy would also expose the
 * `status` column, letting a user approve their own account).
 *
 * `avatarUrl` is left untouched when omitted, so saving a name change can't
 * silently drop a picture that came from an OAuth provider.
 */
export async function updateOwnProfile(input: {
  fullName: string;
  phone: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("update_own_profile", {
    p_full_name: input.fullName,
    // `undefined` (omit the argument, let the SQL default apply) rather than
    // `null`, because that's what the generated RPC types accept for a
    // defaulted parameter. The function treats a missing phone and an empty
    // one identically, so clearing still works.
    p_phone: input.phone ?? undefined,
    p_avatar_url: input.avatarUrl ?? undefined,
  });
  if (error) throw asError(error.message);
}
