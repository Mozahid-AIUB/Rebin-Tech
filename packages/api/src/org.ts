import type { AccountStatus, PickupRequestInput, RequestStatus } from "@rebin/shared";
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

/** Everything S29 renders about one request. */
export type PickupRequestDetail = PickupRequestRow & {
  sizeTier: string;
  categories: string[];
  windowEnd: string;
  timezone: string;
  onSiteContactName: string;
  onSiteContactPhone: string;
  dockAddress: string;
  instructions: string;
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
 * Pickup requests for one organization, newest first.
 *
 * Ordered by created_at desc to match the `pickup_requests_org_idx` index
 * (org_id, created_at desc) rather than fighting it.
 *
 * Filtering happens here rather than over the returned array: narrowing a page
 * of the newest 50 to "completed" would show the completed ones among those
 * 50, not the org's completed pickups -- which is a different and wrong answer
 * the moment an org has more history than one page.
 */
export async function listPickupRequests(
  orgId: string,
  opts: { status?: RequestStatus; idPrefix?: string; limit?: number } = {},
): Promise<PickupRequestRow[]> {
  let query = supabase
    .from("pickup_requests")
    .select("id, status, unit_count, window_start, created_at")
    .eq("org_id", orgId);

  if (opts.status) query = query.eq("status", opts.status);
  // Requests are identified by the head of their uuid everywhere they're
  // shown, so that is what a search box has to match.
  if (opts.idPrefix) query = query.ilike("id", `${opts.idPrefix}%`);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (error) throw asError(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status as RequestStatus,
    unitCount: row.unit_count,
    windowStart: row.window_start,
    createdAt: row.created_at,
  }));
}

/** The dashboard's short strip of recent activity. */
export async function listRecentPickupRequests(
  orgId: string,
  limit = 5,
): Promise<PickupRequestRow[]> {
  return listPickupRequests(orgId, { limit });
}

/**
 * Books a pickup for one organization.
 *
 * A plain insert rather than an RPC: unlike signup, there is nothing to do in
 * a transaction here, and the `req_insert` policy in migration 0008 already
 * enforces both halves of the rule (the row's created_by must be the caller,
 * and the caller must belong to the org).
 *
 * `created_by` comes from the live session rather than a caller argument --
 * the policy compares it against auth.uid(), so a passed-in id would only ever
 * be a way to get the insert rejected.
 */
export async function createPickupRequest(
  orgId: string,
  input: PickupRequestInput & { timezone: string },
): Promise<{ id: string }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw asError(sessionError.message);
  const userId = sessionData.session?.user.id;
  if (!userId) throw asError("Your session has expired. Sign in and try again.");

  const { data, error } = await supabase
    .from("pickup_requests")
    .insert({
      org_id: orgId,
      created_by: userId,
      size_tier: input.sizeTier,
      unit_count: input.unitCount,
      categories: input.categories,
      window_start: input.windowStart,
      window_end: input.windowEnd,
      timezone: input.timezone,
      on_site_contact_name: input.onSiteContactName,
      on_site_contact_phone: input.onSiteContactPhone,
      dock_address: input.dockAddress,
      instructions: input.instructions,
    })
    .select("id")
    .single();
  if (error) throw asError(error.message);
  return { id: data.id };
}

export async function getPickupRequest(requestId: string): Promise<PickupRequestDetail | null> {
  const { data, error } = await supabase
    .from("pickup_requests")
    .select(
      "id, status, size_tier, unit_count, categories, window_start, window_end, timezone, on_site_contact_name, on_site_contact_phone, dock_address, instructions, created_at",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw asError(error.message);
  if (!data) return null;
  return {
    id: data.id,
    status: data.status as RequestStatus,
    sizeTier: data.size_tier as string,
    unitCount: data.unit_count,
    categories: (data.categories ?? []) as string[],
    windowStart: data.window_start,
    windowEnd: data.window_end,
    timezone: data.timezone,
    onSiteContactName: data.on_site_contact_name,
    onSiteContactPhone: data.on_site_contact_phone,
    dockAddress: data.dock_address,
    instructions: data.instructions ?? "",
    createdAt: data.created_at,
  };
}

/**
 * Cancel and reschedule go through RPCs (migration 0016) rather than a table
 * update: which transitions are legal is a business rule, and an UPDATE policy
 * would hand the client the whole `status` column -- including 'completed',
 * the state a recycling certificate is issued from.
 */
export async function cancelPickupRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_pickup_request", { p_request_id: requestId });
  if (error) throw asError(error.message);
}

export async function reschedulePickupRequest(
  requestId: string,
  windowStart: string,
  windowEnd: string,
): Promise<void> {
  const { error } = await supabase.rpc("reschedule_pickup_request", {
    p_request_id: requestId,
    p_window_start: windowStart,
    p_window_end: windowEnd,
  });
  if (error) throw asError(error.message);
}

/**
 * Edits the details an organization owns about itself.
 *
 * Through `update_own_organization` (migration 0018) rather than a table
 * update: `status` and `verified_at` live on the same row, so a writable
 * organizations policy would let an org verify itself. The RPC accepts only
 * the customer-owned fields.
 */
export async function updateOwnOrganization(
  orgId: string,
  input: {
    name: string;
    orgType: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    dockAccess: boolean;
  },
): Promise<void> {
  const { error } = await supabase.rpc("update_own_organization", {
    p_org_id: orgId,
    p_name: input.name,
    p_org_type: input.orgType as never,
    p_street: input.street,
    p_city: input.city,
    p_state: input.state,
    p_zip: input.zip,
    p_dock_access: input.dockAccess,
  });
  if (error) throw asError(error.message);
}

export type OrgMember = {
  userId: string;
  fullName: string;
  email: string;
  memberRole: string;
  joinedAt: string;
};

export type OrgInvitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

/**
 * The team, read through an RPC rather than a join.
 *
 * `profiles_self` (migration 0008) admits only your own row, so a plain
 * PostgREST select returns one name however many colleagues you have. The
 * function checks membership and then reads on your behalf.
 */
export async function listOrganizationMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase.rpc("list_organization_members", { p_org_id: orgId });
  if (error) throw asError(error.message);
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    memberRole: row.member_role as string,
    joinedAt: row.joined_at,
  }));
}

export async function listOrganizationInvitations(orgId: string): Promise<OrgInvitation[]> {
  const { data, error } = await supabase.rpc("list_organization_invitations", { p_org_id: orgId });
  if (error) throw asError(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as string,
    expiresAt: row.expires_at,
  }));
}

/**
 * Invites someone by email.
 *
 * Two outcomes by design (migration 0019): an address that already has an
 * account joins immediately; an unknown one gets a code the inviter passes on
 * themselves, because nothing here sends email yet. The code is returned once
 * and never readable again -- only its hash is stored.
 */
export async function inviteOrgMember(
  orgId: string,
  email: string,
  role: "org_admin" | "org_requester",
): Promise<{ status: "added" | "invited"; code: string | null }> {
  const { data, error } = await supabase.rpc("invite_org_member", {
    p_org_id: orgId,
    p_email: email,
    p_role: role,
  });
  if (error) throw asError(error.message);
  return data as { status: "added" | "invited"; code: string | null };
}

export async function acceptOrgInvitation(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_org_invitation", { p_code: code });
  if (error) throw asError(error.message);
  return data as string;
}

export async function setOrgMemberRole(
  orgId: string,
  userId: string,
  role: "org_admin" | "org_requester",
): Promise<void> {
  const { error } = await supabase.rpc("set_org_member_role", {
    p_org_id: orgId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw asError(error.message);
}

export async function removeOrgMember(orgId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_org_member", {
    p_org_id: orgId,
    p_user_id: userId,
  });
  if (error) throw asError(error.message);
}

/**
 * Identifies the devices in a photo.
 *
 * Through the `scan-inventory` Edge Function, which holds GEMINI_API_KEY --
 * calling Gemini from the app would ship a billable key inside every install.
 *
 * The response is re-parsed against scanResultSchema by the caller: Gemini is
 * constrained by a responseSchema, but this is still a network boundary.
 */
export async function scanInventoryPhoto(
  imageBase64: string,
  mimeType = "image/jpeg",
): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("scan-inventory", {
    body: { imageBase64, mimeType },
  });
  if (error) throw asError(error.message);
  return data;
}

/** Writes the scanned manifest against a request (migration 0020). */
export async function addPickupRequestItems(
  requestId: string,
  items: {
    category: string;
    make: string | null;
    model: string | null;
    serial: string | null;
    confidence: number;
    source: "scan" | "manual";
  }[],
): Promise<number> {
  const { data, error } = await supabase.rpc("add_pickup_request_items", {
    p_request_id: requestId,
    p_items: items as never,
  });
  if (error) throw asError(error.message);
  return (data as number) ?? 0;
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
