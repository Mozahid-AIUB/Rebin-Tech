import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL } from "@/lib/transitions";
import { StatusDot, When, Empty } from "../../ui";
import { PageIn } from "../../Motion";
import type { RequestStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const ALL_STATUSES: RequestStatus[] = [
  "pending",
  "under_review",
  "scheduled",
  "dispatched",
  "in_transit",
  "completed",
  "cancelled",
];

function isStatus(value: string | undefined): value is RequestStatus {
  return !!value && (ALL_STATUSES as string[]).includes(value);
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = isStatus(status) ? status : null;

  const supabase = await createClient();

  let query = supabase
    .from("pickup_requests")
    .select("id, status, unit_count, created_at, dock_address, window_start, size_tier")
    .order("created_at", { ascending: false });

  if (filter) query = query.eq("status", filter);

  const { data, error } = await query;
  const rows = data ?? [];

  return (
    <PageIn>
      <div className="admin-head">
        <h1 className="admin-h1">Requests</h1>
        <span className="admin-count">
          {rows.length} {filter ? STATUS_LABEL[filter].toLowerCase() : "total"}
        </span>
      </div>

      <div className="filters">
        <Link href="/admin/requests" className="filter" aria-current={!filter}>
          All
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/requests?status=${s}`}
            className="filter"
            aria-current={filter === s}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {error && <p className="notice">Could not load requests: {error.message}</p>}

      <div className="table-wrap">
        {rows.length === 0 ? (
          <Empty
            title="No requests here"
            hint={
              filter
                ? "Nothing is at this stage right now."
                : "No organization has filed a pickup request yet."
            }
          />
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Dock</th>
                <th>Units</th>
                <th>Window opens</th>
                <th>Filed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <StatusDot status={row.status} />
                  </td>
                  <td className="cell-name">
                    <Link href={`/admin/requests/${row.id}`}>{row.dock_address}</Link>
                  </td>
                  <td className="cell-mono">{row.unit_count}</td>
                  <td>
                    <When value={row.window_start} />
                  </td>
                  <td>
                    <When value={row.created_at} />
                  </td>
                  <td className="cell-actions">
                    <Link href={`/admin/requests/${row.id}`} className="btn btn-ghost btn-sm">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageIn>
  );
}
