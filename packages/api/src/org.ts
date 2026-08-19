import type { AccountStatus, BusinessType, PickupRequestInput, RequestStatus } from "@rebin/shared";
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
  // Distinguishes a supplier from every other business type. Loaded here, not
  // behind a second query -- a supplier and a repair shop are both biz_owner,
  // so the role can never tell them apart and the dashboard needs this to.
  businessType: BusinessType;
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
    businessType: data.business_type as BusinessType,
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

export type PriceItem = {
  componentKey: string;
  displayName: string;
  category: string;
  grade: "working" | "broken" | "parts";
  unit: "each" | "lb";
  unitPriceCents: number;
  /**
   * Grams, when this row is priced by weight (catalog v3). Null keeps the row
   * priced per item, same as before 0034_weight_pricing.sql.
   */
  avgWeightG: number | null;
};

/**
 * The live price list.
 *
 * Readable without signing in: the portal picker offers "Browse Price Catalog"
 * before login (S02, S66), and RLS only ever exposes the published version --
 * a draft is not an offer.
 */
export async function listCurrentPrices(): Promise<PriceItem[]> {
  // avg_weight_g (0034_weight_pricing.sql) isn't in packages/api's generated
  // types yet -- the CLI can't reach the live database from here to
  // regenerate them. Selected via a raw string so Postgrest still returns
  // it; the casts below only work around the stale local type.
  const { data, error } = await supabase
    .from("price_items")
    .select(
      ("component_key, display_name, category, grade, unit, unit_price_cents, avg_weight_g, price_catalog_versions!inner(status)") as "component_key",
    )
    .eq("price_catalog_versions.status", "active")
    .order("category")
    .order("display_name");
  if (error) throw asError(error.message);
  return ((data ?? []) as unknown as {
    component_key: string;
    display_name: string;
    category: string;
    grade: string;
    unit: string;
    unit_price_cents: number;
    avg_weight_g: number | null;
  }[]).map((row) => ({
    componentKey: row.component_key,
    displayName: row.display_name,
    category: row.category as string,
    grade: row.grade as PriceItem["grade"],
    unit: row.unit as PriceItem["unit"],
    unitPriceCents: row.unit_price_cents,
    avgWeightG: row.avg_weight_g,
  }));
}

export type CurrentPrice = {
  catalogVersionId: string;
  version: number;
  displayName: string;
  unit: "each" | "lb";
  unitPriceCents: number;
};

/**
 * What one component is worth right now.
 *
 * Returns the catalog version alongside the number so a quote can pin the
 * version it was priced against -- a price with no version behind it cannot be
 * defended when the vendor accepts three days later.
 */
export async function getCurrentPrice(
  componentKey: string,
  grade: "working" | "broken" | "parts",
): Promise<CurrentPrice | null> {
  const { data, error } = await supabase.rpc("current_price", {
    p_component_key: componentKey,
    p_grade: grade,
  });
  if (error) throw asError(error.message);
  const row = (data ?? [])[0];
  if (!row) return null;
  return {
    catalogVersionId: row.catalog_version_id,
    version: row.version,
    displayName: row.display_name,
    unit: row.unit as CurrentPrice["unit"],
    unitPriceCents: row.unit_price_cents,
  };
}

export type AppraisedLine = {
  componentKey: string;
  displayName: string;
  /**
   * Still sent to create_quote, which joins price_items on it -- but never
   * shown, and never a choice: catalog v3 has exactly one grade per
   * component ("parts"), attached from the catalog the same way the price is,
   * not picked by the model or the vendor.
   */
  grade: "working" | "broken" | "parts";
  quantity: number;
  /**
   * How sure the model was, or null when there was no model.
   *
   * A hand-typed line has no confidence to report -- nobody guessed, someone
   * said. Reporting 100 would be indistinguishable from a photograph the model
   * read perfectly, which is the one thing an operator reviewing a quote needs
   * to be able to tell apart.
   */
  confidence: number | null;
  notes: string | null;
  unit: "each" | "lb";
  unitPriceCents: number;
  /** Grams this line is priced on (quantity x the catalog average), or null when priced per item. */
  weightG: number | null;
  lineTotalCents: number;
  /** Which door this line came in by. quote_items has carried it since 0023. */
  source: "scan" | "manual";
  /**
   * Roughly what is inside this line, scaled by quantity.
   *
   * From the catalog, never from the model: nobody can see gold content in a
   * photograph, and a model asked anyway returns a different number each time
   * (0040_material_content.sql). Looking it up instead means the same laptop
   * photographed twice reads the same twice.
   *
   * Display only. No total on this screen or any other is computed from it,
   * and the figures are averages across hardware generations -- a 2008 desktop
   * carries several times the gold of a 2022 one.
   *
   * Optional because a manually typed line has no catalog row behind it, and
   * each field is null when the catalog has no figure for that component --
   * which must read as "not recorded", not as "contains none".
   */
  material?: {
    copperG: number | null;
    aluminiumG: number | null;
    steelG: number | null;
    goldMg: number | null;
  };
};

export type Appraisal = {
  items: AppraisedLine[];
  totalCents: number;
  catalogVersionId: string | null;
};

/**
 * Prices a photo of a lot the vendor wants to sell.
 *
 * The Edge Function tells the model which component keys the live catalog
 * knows, then attaches the prices itself -- the model classifies, the catalog
 * prices (plan §6). `catalogVersionId` comes back so an accepted quote can pin
 * the rates it was made at; without it a vendor accepting three days later
 * cannot be shown why they were offered what they were.
 */
export async function appraisePhoto(
  imageBase64: string,
  mimeType = "image/jpeg",
): Promise<Appraisal> {
  const { data, error } = await supabase.functions.invoke<Appraisal>("appraise", {
    body: { imageBase64, mimeType },
  });
  if (error) throw asError(error.message);
  if (!data) throw asError("The appraisal came back empty.");
  return data;
}

export type QuoteStatus = "offered" | "accepted" | "declined" | "expired";

export type QuoteRow = {
  id: string;
  status: QuoteStatus;
  totalCents: number;
  itemCount: number;
  expiresAt: string;
  createdAt: string;
};

export type QuoteLine = {
  componentKey: string;
  displayName: string;
  grade: "working" | "broken" | "parts";
  unit: "each" | "lb";
  quantity: number;
  unitPriceCents: number;
  /**
   * Grams this line was priced on at quote time, or null.
   *
   * Null is not "unknown" here -- it means this line was priced per item, the
   * way every line was before 0034_weight_pricing.sql. Five accepted quotes
   * were made against catalog v2 and are null for exactly that reason; they
   * are historical record of an offer Rebin actually made; and rendering as
   * if they had a weight would misrepresent that offer.
   */
  weightG: number | null;
  lineTotalCents: number;
  confidence: number | null;
  notes: string | null;
};

/**
 * How the reconciliation in migration 0030 stands.
 *
 * 'not_required' never reaches a quote screen -- it is the free-pickup case --
 * but it is the column's default, so a collection read before it finishes
 * carries it.
 */
export type Reconciliation = "not_required" | "matched" | "mismatch" | "resolved";

/**
 * What actually came off the vendor's dock, once anyone has been.
 *
 * `expectedUnits` is null until the job is finished: it is snapshotted from
 * the quote at collection time, not read from it now, so an agent still
 * driving has nothing to report.
 */
export type QuoteCollection = {
  status: JobStatus;
  collectedAt: string | null;
  expectedUnits: number | null;
  actualUnits: number | null;
  reconciliation: Reconciliation;
  resolutionNote: string | null;
};

export type QuoteDetail = Omit<QuoteRow, "itemCount"> & {
  catalogVersionId: string;
  decidedAt: string | null;
  items: QuoteLine[];
  /** Null until an agent has claimed the accepted quote. */
  collection: QuoteCollection | null;
};

/**
 * Turns a finished appraisal into an offer the vendor can come back to.
 *
 * Only the component key, grade and quantity are sent. Prices are read from
 * the catalog inside `create_quote` (migration 0023) and the total recomputed
 * there -- a client that could name its own price could name its own payout.
 */
export async function createQuote(
  businessId: string,
  items: {
    componentKey: string;
    grade: "working" | "broken" | "parts";
    quantity: number;
    confidence: number | null;
    notes: string | null;
    source: "scan" | "manual";
  }[],
): Promise<string> {
  const { data, error } = await supabase.rpc("create_quote", {
    p_business_id: businessId,
    p_items: items as never,
  });
  if (error) throw asError(error.message);
  return data as string;
}

export async function listQuotes(businessId: string): Promise<QuoteRow[]> {
  const { data, error } = await supabase.rpc("list_quotes", { p_business_id: businessId });
  if (error) throw asError(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status as QuoteStatus,
    totalCents: row.total_cents,
    itemCount: Number(row.item_count),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

export async function getQuote(quoteId: string): Promise<QuoteDetail | null> {
  // weight_g (0034_weight_pricing.sql) isn't in packages/api's generated
  // types yet -- the CLI can't reach the live database from here to
  // regenerate them. Selected via a raw string so Postgrest still returns
  // it; the cast on `items.data` below only works around the stale local type.
  const [quote, items, collection] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, status, total_cents, catalog_version_id, expires_at, decided_at, created_at")
      .eq("id", quoteId)
      .maybeSingle(),
    supabase
      .from("quote_items")
      .select(
        ("component_key, display_name, grade, unit, quantity, unit_price_cents, weight_g, line_total_cents, confidence, notes") as "component_key",
      )
      .eq("quote_id", quoteId),
    // Through `quote_collection` (migration 0031) rather than a select on
    // job_assignments: RLS would admit the row, and with it the agent's id and
    // their own running notes, which are written for dispatch and not for the
    // customer. The function returns the outcome alone.
    supabase.rpc("quote_collection", { p_quote_id: quoteId }),
  ]);
  if (quote.error) throw asError(quote.error.message);
  if (items.error) throw asError(items.error.message);
  if (collection.error) throw asError(collection.error.message);
  if (!quote.data) return null;

  const row = quote.data;
  const job = (collection.data ?? [])[0];
  // Reported expired the moment it lapses, whether or not a write has caught
  // up -- offering an Accept button that can only fail is worse than saying so.
  const expired = row.status === "offered" && new Date(row.expires_at) <= new Date();
  return {
    id: row.id,
    status: (expired ? "expired" : row.status) as QuoteStatus,
    totalCents: row.total_cents,
    catalogVersionId: row.catalog_version_id,
    expiresAt: row.expires_at,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    items: ((items.data ?? []) as unknown as {
      component_key: string;
      display_name: string;
      grade: string;
      unit: string;
      quantity: number;
      unit_price_cents: number;
      weight_g: number | null;
      line_total_cents: number;
      confidence: number | null;
      notes: string | null;
    }[]).map((i) => ({
      componentKey: i.component_key,
      displayName: i.display_name,
      grade: i.grade as QuoteLine["grade"],
      unit: i.unit as QuoteLine["unit"],
      quantity: i.quantity,
      unitPriceCents: i.unit_price_cents,
      weightG: i.weight_g,
      lineTotalCents: i.line_total_cents,
      confidence: i.confidence,
      notes: i.notes,
    })),
    collection: job
      ? {
          status: job.status as JobStatus,
          collectedAt: job.collected_at ?? null,
          expectedUnits: job.expected_units ?? null,
          actualUnits: job.actual_units ?? null,
          reconciliation: job.reconciliation as Reconciliation,
          resolutionNote: job.resolution_note ?? null,
        }
      : null,
  };
}

export async function decideQuote(quoteId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc("decide_quote", {
    p_quote_id: quoteId,
    p_accept: accept,
  });
  if (error) throw asError(error.message);
}

export type JobStatus = "claimed" | "en_route" | "on_site" | "collected" | "cancelled";

/**
 * What kind of errand a job is.
 *
 * 'pickup' is an organization's free collection -- counted, not bought.
 * 'collection' is an accepted quote at a business -- bought and paid for.
 * They share a driver and a van, so they share a board.
 */
export type JobKind = "pickup" | "collection";

export type AvailableJob = {
  kind: JobKind;
  /** The pickup request or the quote, depending on `kind`. */
  subjectId: string;
  accountName: string;
  street: string;
  city: string;
  state: string;
  unitCount: number;
  /** Null for a free pickup; what the vendor is owed for a collection. */
  payoutCents: number | null;
  /** Null on a collection: a vendor agrees a price, not a slot. */
  windowStart: string | null;
  windowEnd: string | null;
  timezone: string;
};

export type MyJob = {
  id: string;
  kind: JobKind;
  subjectId: string;
  status: JobStatus;
  accountName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  unitCount: number;
  payoutCents: number | null;
  windowStart: string | null;
  windowEnd: string | null;
  timezone: string;
  claimedAt: string;
  collectedAt: string | null;
};

export type AgentSummary = {
  jobsCompleted: number;
  devicesCollected: number;
  jobsActive: number;
  /** What the paid collections were worth -- the nearest thing to earnings
   *  until an agent rate table exists. */
  collectedValueCents: number;
};

/** Everything waiting for a driver: free pickups and paid collections alike. */
export async function listAvailableJobs(): Promise<AvailableJob[]> {
  const { data, error } = await supabase.rpc("list_available_jobs");
  if (error) throw asError(error.message);
  return (data ?? []).map((row) => ({
    kind: row.kind as JobKind,
    subjectId: row.subject_id,
    accountName: row.account_name,
    street: row.street,
    city: row.city,
    state: row.state,
    unitCount: row.unit_count,
    payoutCents: row.payout_cents,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    timezone: row.timezone,
  }));
}

export async function listMyJobs(): Promise<MyJob[]> {
  const { data, error } = await supabase.rpc("list_my_jobs");
  if (error) throw asError(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as JobKind,
    subjectId: row.subject_id,
    status: row.status as JobStatus,
    accountName: row.account_name,
    street: row.street,
    city: row.city,
    state: row.state,
    zip: row.zip,
    unitCount: row.unit_count,
    payoutCents: row.payout_cents,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    timezone: row.timezone,
    claimedAt: row.claimed_at,
    collectedAt: row.collected_at,
  }));
}

/**
 * Takes a job off the board.
 *
 * The unique index in migration 0024 is what actually stops two agents
 * claiming the same pickup; this surfaces the collision as a sentence.
 */
export async function claimJob(requestId: string): Promise<string> {
  const { data, error } = await supabase.rpc("claim_job", { p_request_id: requestId });
  if (error) throw asError(error.message);
  return data as string;
}

/** Takes a paid collection -- an accepted quote -- off the board. */
export async function claimCollection(quoteId: string): Promise<string> {
  const { data, error } = await supabase.rpc("claim_collection", { p_quote_id: quoteId });
  if (error) throw asError(error.message);
  return data as string;
}

/**
 * Moves a job to its next stage, and the customer's request with it.
 *
 * `actualUnits` is required to reach 'collected' -- the count is what the
 * certificate and any later dispute rest on, so the RPC refuses without one.
 */
export async function advanceJob(
  jobId: string,
  status: JobStatus,
  actualUnits?: number,
  notes?: string,
): Promise<void> {
  const { error } = await supabase.rpc("advance_job", {
    p_job_id: jobId,
    p_status: status,
    p_actual_units: actualUnits ?? undefined,
    p_notes: notes ?? undefined,
  });
  if (error) throw asError(error.message);
}

export async function getAgentSummary(): Promise<AgentSummary> {
  const { data, error } = await supabase.rpc("my_agent_summary");
  if (error) throw asError(error.message);
  const row = (data ?? [])[0];
  return {
    jobsCompleted: Number(row?.jobs_completed ?? 0),
    devicesCollected: Number(row?.devices_collected ?? 0),
    jobsActive: Number(row?.jobs_active ?? 0),
    collectedValueCents: Number(row?.collected_value_cents ?? 0),
  };
}

export type OrgSummary2 = {
  activeCount: number;
  activeDevices: number;
  nextPickup: string | null;
  completedCount: number;
  devicesRecycled: number;
};

/**
 * The organization's lifetime figures.
 *
 * Computed in the database rather than from the loaded page: "devices
 * recycled" is a lifetime total, and reading it off the five most recent
 * requests would undercount any org that has used the product for a while.
 */
export async function getOrgSummary(orgId: string): Promise<OrgSummary2> {
  const { data, error } = await supabase.rpc("my_org_summary", { p_org_id: orgId });
  if (error) throw asError(error.message);
  const row = (data ?? [])[0];
  return {
    activeCount: Number(row?.active_count ?? 0),
    activeDevices: Number(row?.active_devices ?? 0),
    nextPickup: row?.next_pickup ?? null,
    completedCount: Number(row?.completed_count ?? 0),
    devicesRecycled: Number(row?.devices_recycled ?? 0),
  };
}

export async function getBusiness(businessId: string): Promise<BusinessSummary | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, status, business_type")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw asError(error.message);
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    status: data.status as AccountStatus,
    businessType: data.business_type as BusinessType,
  };
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
