import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE, STATUS_LABEL } from "@/lib/transitions";
import { effectiveQuoteStatus } from "@/lib/quotes";
import { StatusDot, When, Empty } from "../ui";
import { PageIn, Stagger, StaggerItem, Tally } from "../Motion";
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

  const [pendingAccounts, requests, quotes, catalogVersions] = await Promise.all([
    supabase.from("pending_accounts").select("kind"),
    supabase.from("pickup_requests").select("id, status, unit_count, created_at, dock_address"),
    supabase.from("quotes").select("status, expires_at"),
    supabase.from("price_catalog_versions").select("id, status"),
  ]);

  // `pending_accounts` unions organizations, businesses and agents (0015).
  // Agents now have their own tile below, linking to their own screen, so the
  // accounts tile counts only the other two kinds -- otherwise one pending
  // agent would be claimed by both tiles and the two numbers on the overview
  // would not reconcile against the view's total.
  const pendingRows = pendingAccounts.data ?? [];
  const accountCount = pendingRows.filter((r) => r.kind !== "agent").length;
  const pendingAgentCount = pendingRows.filter((r) => r.kind === "agent").length;

  // A quote counts as "offered" here only if it still effectively is: an
  // `offered` row whose `expires_at` has passed reads as expired on the
  // Quotes screen (via the same `effectiveQuoteStatus`), so counting the raw
  // column here would make this tile disagree with that screen.
  const offeredQuoteCount = (quotes.data ?? []).filter(
    (q) => effectiveQuoteStatus(q.status, q.expires_at) === "offered",
  ).length;

  const hasActiveCatalog = (catalogVersions.data ?? []).some((v) => v.status === "active");

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

  const error = pendingAccounts.error ?? requests.error ?? quotes.error ?? catalogVersions.error;

  return (
    <PageIn>
      <div className="admin-head">
        <h1 className="admin-h1">Overview</h1>
      </div>

      {error && (
        <p className="notice">
          Could not load the queues: {error.message}
        </p>
      )}

      <Stagger className="tiles">
        <StaggerItem>
          <Link href="/admin/accounts" className="tile">
            <span className="tile-label">Accounts waiting</span>
            <span className="tile-value" data-zero={accountCount === 0}>
              <Tally value={accountCount} />
            </span>
          </Link>
        </StaggerItem>

        <StaggerItem>
          <Link href="/admin/agents?status=pending_verification" className="tile">
            <span className="tile-label">Agents awaiting review</span>
            <span className="tile-value" data-zero={pendingAgentCount === 0}>
              <Tally value={pendingAgentCount} />
            </span>
          </Link>
        </StaggerItem>

        <StaggerItem>
          <Link href="/admin/quotes?status=offered" className="tile">
            <span className="tile-label">Quotes offered</span>
            <span className="tile-value" data-zero={offeredQuoteCount === 0}>
              <Tally value={offeredQuoteCount} />
            </span>
          </Link>
        </StaggerItem>

        {PIPELINE.filter((s) => s !== "completed").map((status) => {
          const count = byStatus.get(status) ?? 0;
          return (
            <StaggerItem key={status}>
              <Link
                href={`/admin/requests?status=${status}`}
                className="tile"
              >
                <span className="tile-label">{STATUS_LABEL[status]}</span>
                <span className="tile-value" data-zero={count === 0}>
                  <Tally value={count} />
                </span>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>

      {!hasActiveCatalog && !error && (
        <div className="panel">
          <p className="admin-sub" style={{ margin: 0 }}>
            No catalog is published. A business cannot build a quote until one
            version is active --{" "}
            <Link href="/admin/prices">publish one on the Prices screen</Link>.
          </p>
        </div>
      )}

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
    </PageIn>
  );
}
