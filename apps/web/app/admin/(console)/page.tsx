import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE, STATUS_LABEL } from "@/lib/transitions";
import { StatusDot, When, Empty } from "../ui";
import type { RequestStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * What needs an operator right now.
 *
 * Two queues and a pipeline count, in that order, because that is the order
 * the questions get asked: is anyone waiting to be let in, is anything
 * waiting to be moved, and where is everything else.
 */
export default async function OverviewPage() {
  const supabase = await createClient();

  const [pendingAccounts, requests] = await Promise.all([
    supabase.from("pending_accounts").select("kind"),
    supabase.from("pickup_requests").select("id, status, unit_count, created_at, dock_address"),
  ]);

  const accountCount = pendingAccounts.data?.length ?? 0;
  const rows = requests.data ?? [];

  const byStatus = new Map<RequestStatus, number>();
  for (const row of rows) {
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
  }

  // The requests an operator can actually act on today: everything still on
  // the line. Completed and cancelled ones are history, not work.
  const open = rows
    .filter((r) => r.status !== "completed" && r.status !== "cancelled")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const error = pendingAccounts.error ?? requests.error;

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-h1">Overview</h1>
      </div>

      {error && (
        <p className="notice">
          Could not load the queues: {error.message}
        </p>
      )}

      <div className="tiles">
        <Link href="/admin/accounts" className="tile">
          <span className="tile-label">Accounts waiting</span>
          <span className="tile-value" data-zero={accountCount === 0}>
            {accountCount}
          </span>
        </Link>

        {PIPELINE.filter((s) => s !== "completed").map((status) => {
          const count = byStatus.get(status) ?? 0;
          return (
            <Link
              key={status}
              href={`/admin/requests?status=${status}`}
              className="tile"
            >
              <span className="tile-label">{STATUS_LABEL[status]}</span>
              <span className="tile-value" data-zero={count === 0}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="admin-head">
        <h2 className="admin-h1">Open requests</h2>
        <span className="admin-count">{open.length} on the line</span>
      </div>

      <div className="table-wrap">
        {open.length === 0 ? (
          <Empty
            title="Nothing waiting"
            hint="Every request has been collected or cancelled."
          />
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Dock</th>
                <th>Units</th>
                <th>Filed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {open.map((row) => (
                <tr key={row.id}>
                  <td>
                    <StatusDot status={row.status} />
                  </td>
                  <td className="cell-name">
                    <Link href={`/admin/requests/${row.id}`}>{row.dock_address}</Link>
                  </td>
                  <td className="cell-mono">{row.unit_count}</td>
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
    </>
  );
}
