import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountStatusDot, When, Empty } from "../../ui";
import { PageIn } from "../../Motion";
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
 * Live work comes from `job_assignments` (0024): any assignment not
 * `cancelled` is what the agent is doing right now, joined in here so an
 * operator can see who is mid-collection without a second screen.
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
  const { data: jobs } = agentIds.length
    ? await supabase
        .from("job_assignments")
        .select("agent_id, status, request_id")
        .in("agent_id", agentIds)
        .neq("status", "cancelled")
    : { data: [] };

  const requestIds = [...new Set((jobs ?? []).map((j) => j.request_id).filter((id): id is string => !!id))];
  const { data: requests } = requestIds.length
    ? await supabase.from("pickup_requests").select("id, dock_address").in("id", requestIds)
    : { data: [] };
  const dockFor = new Map((requests ?? []).map((r) => [r.id, r.dock_address]));

  const jobFor = new Map(
    (jobs ?? []).map((j) => [
      j.agent_id,
      { status: j.status, dock: j.request_id ? dockFor.get(j.request_id) : undefined },
    ]),
  );

  return (
    <PageIn>
      <div className="admin-head">
        <h1 className="admin-h1">Agents</h1>
        <span className="admin-count">
          {rows.length} {filter ? ACCOUNT_LABEL[filter].toLowerCase() : "total"}
        </span>
      </div>

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
                      {job ? (job.dock ?? job.status.replace(/_/g, " ")) : "—"}
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
