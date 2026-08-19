import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE, STATUS_LABEL } from "@/lib/transitions";
import { StatusDot, When, Empty } from "../ui";
import { PageIn, Stagger, StaggerItem, Tally } from "../Motion";
import { PipelineBar } from "./PipelineBar";
import { RankedBars, Meter, money } from "./Charts";
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

  // Every count on this screen must be an exact PostgREST count
  // (`{ count: "exact", head: true }`), not `data.length` over a fetched
  // array: `supabase/config.toml` caps `max_rows` at 1000, so past that many
  // rows a JS-side count would silently under-report with no error. A `head`
  // request asks Postgres for the count and returns no rows at all, so this
  // is not merely more correct than the old approach, it is cheaper too.
  //
  // The pipeline tiles need one exact count per status, so those run
  // alongside the two queue counts and the offered-quotes count.
  const nonPipelineCounts = await Promise.all([
    // `pending_accounts` unions organizations, businesses and agents (0015).
    // Agents have their own tile below, linking to their own screen, so this
    // tile counts only the other two kinds -- otherwise one pending agent
    // would be claimed by both tiles and the two numbers on the overview
    // would not reconcile against the view's total. This also has to match
    // what `/admin/accounts` itself now counts, since that screen filters
    // agents out at the query with the same `.neq("kind", "agent")`.
    supabase.from("pending_accounts").select("*", { count: "exact", head: true }).neq("kind", "agent"),
    supabase.from("pending_accounts").select("*", { count: "exact", head: true }).eq("kind", "agent"),
    // "Offered" is not a raw column value: a quote whose `status` is
    // `offered` but whose `expires_at` has passed reads as `expired`
    // everywhere else in the console, via `effectiveQuoteStatus` in
    // `lib/quotes.ts`. A `head: true` count can't call that helper, so the
    // same rule is expressed as query filters instead -- strictly greater
    // than `now()`, matching the helper's own boundary (`expires_at <= now`
    // is expired), so this count agrees with what `/admin/quotes` displays
    // for the same rows. The helper stays the single source of truth for
    // display; this only has to agree with it.
    supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("status", "offered")
      .gt("expires_at", new Date().toISOString()),
    supabase.from("price_catalog_versions").select("id, status").eq("status", "active").limit(1),
  ]);
  const [pendingAccountsCount, pendingAgentsCount, offeredQuotesCount, activeCatalog] = nonPipelineCounts;

  const pipelineCounts = await Promise.all(
    PIPELINE.map((status) =>
      supabase.from("pickup_requests").select("*", { count: "exact", head: true }).eq("status", status),
    ),
  );
  const byStatus = new Map<RequestStatus, number>();
  pipelineCounts.forEach((result, i) => {
    byStatus.set(PIPELINE[i]!, result.count ?? 0);
  });

  // The requests an operator can actually act on today: everything still on
  // the line. Completed and cancelled ones are history, not work. This table
  // itself stays an unpaginated list -- out of scope for the 1000-row limit
  // fix, which is about the *counts* the tiles report, not this table.
  const openRequests = await supabase
    .from("pickup_requests")
    .select("id, status, unit_count, created_at, dock_address")
    .in("status", PIPELINE.filter((s) => s !== "completed"))
    .order("created_at", { ascending: true });

  // The charts below. Read at request time like everything else on this page
  // -- there is no seeded or illustrative data anywhere in this console.
  const [quoteItems, jobs, requestCategories] = await Promise.all([
    supabase.from("quote_items").select("display_name, quantity, line_total_cents"),
    supabase.from("job_assignments").select("actual_units"),
    supabase.from("pickup_requests").select("categories, unit_count"),
  ]);

  // Value by component, highest first. Answers what is actually worth
  // collecting, which the catalog cannot: a high rate on something nobody
  // ever ships is not revenue.
  const valueByComponent = new Map<string, number>();
  for (const item of quoteItems.data ?? []) {
    valueByComponent.set(
      item.display_name,
      (valueByComponent.get(item.display_name) ?? 0) + item.line_total_cents,
    );
  }
  const topValue = [...valueByComponent.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  // Which categories organizations actually ask for. Counted per request
  // rather than per unit: one request for 400 monitors is one customer with a
  // monitor problem, not four hundred of them.
  const byCategory = new Map<string, number>();
  for (const row of requestCategories.data ?? []) {
    for (const category of row.categories ?? []) {
      byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
    }
  }
  const categoryRows = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label: label.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
      value,
    }));

  const bookedUnits = (requestCategories.data ?? []).reduce(
    (sum, r) => sum + (r.unit_count ?? 0),
    0,
  );
  const collectedUnits = (jobs.data ?? []).reduce(
    (sum, j) => sum + (j.actual_units ?? 0),
    0,
  );

  const accountCount = pendingAccountsCount.count ?? 0;
  const pendingAgentCount = pendingAgentsCount.count ?? 0;
  const offeredQuoteCount = offeredQuotesCount.count ?? 0;
  const hasActiveCatalog = (activeCatalog.data ?? []).length > 0;

  const open = [...(openRequests.data ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const error =
    pendingAccountsCount.error ??
    pendingAgentsCount.error ??
    offeredQuotesCount.error ??
    activeCatalog.error ??
    pipelineCounts.find((r) => r.error)?.error ??
    openRequests.error;

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

      <PipelineBar byStatus={byStatus} />

      <div className="chart-grid">
        <RankedBars
          title="Where the value is"
          note="Total quoted, by component, across every quote in the database."
          rows={topValue}
          format={money}
        />
        <RankedBars
          title="What organizations ask for"
          note="Pickup requests naming each category. Counted per request, not per device."
          rows={categoryRows}
        />
      </div>

      <div className="chart-grid">
        <Meter
          title="Booked against collected"
          note="Units an agent recorded on arrival, against units organizations booked. A wide gap is either optimistic booking or work still on the line."
          value={collectedUnits}
          total={bookedUnits}
          format={(n) => n.toLocaleString("en-US")}
        />
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
    </PageIn>
  );
}
