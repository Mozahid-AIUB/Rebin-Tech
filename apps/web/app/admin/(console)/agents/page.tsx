import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountStatusDot, When, Empty } from "../../ui";
import { PageIn } from "../../Motion";
import { PeopleTabs } from "../PeopleTabs";
import { AgentActions } from "./AgentActions";
import type { AccountStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const ALL_STATUSES: AccountStatus[] = [
  "pending_verification",
  "active",
  "suspended",
  "rejected",
  "archived",
];

const ACCOUNT_LABEL: Record<AccountStatus, string> = {
  pending_verification: "Pending",
  active: "Active",
  suspended: "Suspended",
  rejected: "Rejected",
  archived: "Archived",
};

/** `agent_vehicle_enum`, readably: `box_truck` should not read as `box_truck`. */
const VEHICLE_LABEL: Record<string, string> = {
  car: "Car",
  van: "Van",
  box_truck: "Box truck",
  none: "No vehicle",
};

function isStatus(value: string | undefined): value is AccountStatus {
  return !!value && (ALL_STATUSES as string[]).includes(value);
}

/**
 * Field agents, for review and oversight.
 *
 * There is no "Add agent" here: `create_field_agent` (0011) needs an auth
 * user this app has no service-role key to create, and the function carries
 * no `is_platform_staff()` check at all -- it is the public signup path an
 * agent runs from the mobile app, not an admin action. This screen only
 * reads `agent_profiles` joined to `profiles`, and writes through
 * `set_agent_status` (0015), the one RPC that can move an agent's status.
 *
 * Live work comes from `job_assignments` (0024, extended in 0026): a job in
 * `claimed`, `en_route` or `on_site` is what the agent is doing right now,
 * joined in here so an operator can see who is mid-collection without a
 * second screen. `collected` is deliberately excluded -- it is a finished
 * job, not a current one. Since 0026 a job hangs off either a pickup request
 * or a paid collection (a quote), never both, so both are resolved to a
 * human-readable place: a pickup's dock, or a paid collection's business.
 */
export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = isStatus(status) ? status : null;

  const supabase = await createClient();

  // Filtering happens in JS below, against `profiles.status`: the status an
  // operator filters on lives on the joined profile, not on this table, so
  // there is nothing here for a `.eq()` to target.
  const { data, error } = await supabase
    .from("agent_profiles")
    .select(
      "user_id, service_city, service_state, service_zip, vehicle, profiles(full_name, phone, status, created_at)",
    )
    .order("created_at", { ascending: true });

  const all = (data ?? []).filter(
    (row): row is typeof row & { profiles: NonNullable<(typeof row)["profiles"]> } =>
      row.profiles !== null,
  );

  const rows = filter ? all.filter((row) => row.profiles.status === filter) : all;

  const agentIds = all.map((row) => row.user_id);

  // "Current job" means live work, not history: since 0026, `collected` is a
  // terminal status (the job is done), so an agent who finished last week
  // must not still read as busy under this heading. `claim_collection` claims
  // the most recent one first only in the sense that ties are broken by
  // `claimed_at`, ordered below -- an agent legitimately holding more than
  // one live job shows the one claimed most recently.
  const LIVE_JOB_STATUSES = ["claimed", "en_route", "on_site"] as const;
  const { data: jobs, error: jobsError } = agentIds.length
    ? await supabase
        .from("job_assignments")
        .select("agent_id, status, request_id, quote_id, claimed_at")
        .in("agent_id", agentIds)
        .in("status", LIVE_JOB_STATUSES)
        .order("claimed_at", { ascending: false })
    : { data: [], error: null };

  // Since 0026, a job hangs off either a pickup request or a paid collection
  // (a quote), never both -- `request_id` is nullable and a paid collection
  // has none, so resolving only `pickup_requests` left every collection's
  // cell blank. Both sides are resolved here: a pickup's dock (falling back
  // to the organization's street, the same `coalesce(nullif(..), ..)` rule
  // `list_my_jobs`/`list_available_jobs` apply in 0026, so an empty
  // `dock_address` doesn't render an empty cell) and a collection's business
  // name via `quote_id` -> `quotes.business_id` -> `businesses.name`.
  const requestIds = [...new Set((jobs ?? []).map((j) => j.request_id).filter((id): id is string => !!id))];
  const quoteIds = [...new Set((jobs ?? []).map((j) => j.quote_id).filter((id): id is string => !!id))];

  const [{ data: requests, error: requestsError }, { data: quotes, error: quotesError }] = await Promise.all([
    requestIds.length
      ? supabase.from("pickup_requests").select("id, dock_address, org_id").in("id", requestIds)
      : Promise.resolve({ data: [], error: null }),
    quoteIds.length
      ? supabase.from("quotes").select("id, business_id").in("id", quoteIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const orgIds = [...new Set((requests ?? []).map((r) => r.org_id))];
  const businessIds = [...new Set((quotes ?? []).map((q) => q.business_id))];

  const [{ data: orgs, error: orgsError }, { data: businesses, error: businessesError }] = await Promise.all([
    orgIds.length
      ? supabase.from("organizations").select("id, street").in("id", orgIds)
      : Promise.resolve({ data: [], error: null }),
    businessIds.length
      ? supabase.from("businesses").select("id, name").in("id", businessIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const streetForOrg = new Map((orgs ?? []).map((o) => [o.id, o.street]));
  const dockFor = new Map(
    (requests ?? []).map((r) => [r.id, r.dock_address || streetForOrg.get(r.org_id) || ""]),
  );
  const nameForBusiness = new Map((businesses ?? []).map((b) => [b.id, b.name]));
  const businessForQuote = new Map((quotes ?? []).map((q) => [q.id, nameForBusiness.get(q.business_id)]));

  // `jobs` is already ordered by `claimed_at` descending, so the first row
  // seen per agent in this `Map` build is deterministically the most
  // recently claimed live job, not whichever happened to sort last.
  const jobFor = new Map<
    string,
    { status: string; label: string | undefined }
  >();
  for (const j of jobs ?? []) {
    if (jobFor.has(j.agent_id)) continue;
    const label = j.request_id ? dockFor.get(j.request_id) : businessForQuote.get(j.quote_id!);
    jobFor.set(j.agent_id, { status: j.status, label });
  }

  const secondaryError = jobsError ?? requestsError ?? quotesError ?? orgsError ?? businessesError;

  return (
    <PageIn>
      <div className="admin-head">
        <h1 className="admin-h1">People</h1>
        <span className="admin-count">
          {rows.length} {filter ? ACCOUNT_LABEL[filter].toLowerCase() : "total"}
        </span>
      </div>

      <PeopleTabs current="/admin/agents" />

      <p className="admin-sub">
        Agents register themselves in the mobile app. There is no way to add
        one here -- this screen reviews who has signed up and tracks who is
        currently out on a collection.
      </p>

      <div className="filters">
        <Link href="/admin/agents" className="filter" aria-current={!filter}>
          All
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/agents?status=${s}`}
            className="filter"
            aria-current={filter === s}
          >
            {ACCOUNT_LABEL[s]}
          </Link>
        ))}
      </div>

      {error && <p className="notice">Could not load agents: {error.message}</p>}
      {!error && secondaryError && (
        <p className="notice">
          Agents loaded, but current jobs could not: {secondaryError.message}. The
          "Current job" column below may be incomplete.
        </p>
      )}

      <div className="table-wrap">
        {rows.length === 0 ? (
          <Empty
            title="No agents here"
            hint={
              filter
                ? "Nobody is at this stage right now."
                : "Nobody has registered as a field agent in the mobile app yet."
            }
          />
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Service area</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Current job</th>
                <th>Registered</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const job = jobFor.get(row.user_id);
                return (
                  <tr key={row.user_id}>
                    <td className="cell-name">{row.profiles.full_name}</td>
                    <td>
                      {row.service_city}, {row.service_state} {row.service_zip}
                    </td>
                    <td>{VEHICLE_LABEL[row.vehicle] ?? row.vehicle}</td>
                    <td>
                      <AccountStatusDot status={row.profiles.status} />
                    </td>
                    <td className="cell-dim">
                      {job ? (job.label ?? job.status.replace(/_/g, " ")) : "—"}
                    </td>
                    <td>
                      <When value={row.profiles.created_at} />
                    </td>
                    <td className="cell-actions">
                      <AgentActions
                        userId={row.user_id}
                        name={row.profiles.full_name}
                        status={row.profiles.status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PageIn>
  );
}
