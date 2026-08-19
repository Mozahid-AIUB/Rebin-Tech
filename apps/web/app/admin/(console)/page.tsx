import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PIPELINE, STATUS_LABEL, toneFor, type StatusTone } from "@/lib/transitions";
import { PageIn, Stagger, StaggerItem, Tally } from "../Motion";
import { PipelineBar } from "./PipelineBar";
import { RankedBars, Meter, money } from "./Charts";
import { Activity, PAGE_SIZE, type ActivityEvent } from "./Activity";
import type { RequestStatus } from "@/lib/supabase/types";

/**
 * Quote status to the badge tone it wears, mirroring QUOTE_TONE in ui.tsx.
 *
 * Duplicated rather than exported from there because ui.tsx keeps its map
 * private behind QuoteStatusDot, and the feed needs the tone without the
 * component -- its rows show "Offered · $412", not a bare status pill.
 */
const QUOTE_TONE = {
  offered: "waiting",
  accepted: "active",
  expired: "stopped",
  withdrawn: "stopped",
} as const satisfies Record<string, StatusTone>;

export const dynamic = "force-dynamic";

/**
 * What needs an operator right now.
 *
 * Two queues and a pipeline count, in that order, because that is the order
 * the questions get asked: is anyone waiting to be let in, is anything
 * waiting to be moved, and where is everything else.
 */
export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const supabase = await createClient();

  // Page number for the activity feed. Anything that is not a positive
  // integer -- "abc", "-1", "0", a pasted fragment -- is page one rather than
  // an error: a bad query string should not be able to break the console's
  // front page.
  const requestedPage = Number((await searchParams).p);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

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

  // The activity feed.
  //
  // Merged in JS rather than in SQL because the four sources have nothing in
  // common but a timestamp -- different columns, different joins, different
  // RLS. A database view that unioned them would have to flatten each to the
  // same shape anyway, and would then be a second place to edit every time a
  // column moves.
  //
  // Each source is capped: the feed only ever shows the newest page, so
  // fetching more than a few pages' worth of each is work thrown away. The
  // cap is generous enough that the merge is exact for any page a person
  // actually pages to.
  const FEED_CAP = 200;
  const [feedRequests, feedQuotes, feedPayouts, feedOrgs, feedBusinesses] = await Promise.all([
    supabase
      .from("pickup_requests")
      .select("id, status, unit_count, created_at, dock_address, organizations(name)")
      .order("created_at", { ascending: false })
      .limit(FEED_CAP),
    supabase
      .from("quotes")
      .select("id, status, total_cents, created_at, businesses(name)")
      .order("created_at", { ascending: false })
      .limit(FEED_CAP),
    supabase
      .from("payouts")
      .select("id, final_cents, paid_at, received_at, created_at, quotes(businesses(name))")
      .order("created_at", { ascending: false })
      .limit(FEED_CAP),
    supabase
      .from("organizations")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(FEED_CAP),
    supabase
      .from("businesses")
      .select("id, name, business_type, created_at")
      .order("created_at", { ascending: false })
      .limit(FEED_CAP),
  ]);

  /**
   * PostgREST returns an embedded to-one as an object or a one-element array.
   *
   * Null when the join produced nothing, so a caller can leave the name out
   * rather than printing "Unknown" beside a perfectly good address.
   */
  const nameOf = (embed: unknown): string | null => {
    const row = Array.isArray(embed) ? embed[0] : embed;
    const name = (row as { name?: unknown } | null | undefined)?.name;
    return typeof name === "string" && name.length > 0 ? name : null;
  };

  /** "Cedar Ridge · Dock B", or just whichever half exists. */
  const withDock = (name: string | null, dock: string | null) =>
    [name, dock].filter(Boolean).join(" · ") || "Unnamed";

  const feed: ActivityEvent[] = [
    ...(feedRequests.data ?? []).map((r) => ({
      kind: "request" as const,
      // The dock is what an operator recognises a request by -- it is what the
      // old Open requests table led with, and "Cedar Ridge" alone does not
      // distinguish two of their buildings.
      title: withDock(nameOf(r.organizations), r.dock_address),
      detail: `${STATUS_LABEL[r.status as RequestStatus]} · ${r.unit_count} units`,
      at: r.created_at,
      href: `/admin/requests/${r.id}`,
      tone: toneFor(r.status as RequestStatus),
    })),
    ...(feedQuotes.data ?? []).map((q) => ({
      kind: "quote" as const,
      title: nameOf(q.businesses) ?? "Unnamed",
      detail: `${q.status} · ${money(q.total_cents)}`,
      at: q.created_at,
      href: `/admin/quotes/${q.id}`,
      tone: QUOTE_TONE[q.status as keyof typeof QUOTE_TONE] ?? "waiting",
    })),
    ...(feedPayouts.data ?? []).map((p) => {
      const quote = Array.isArray(p.quotes) ? p.quotes[0] : p.quotes;
      return {
        kind: "payout" as const,
        title: nameOf((quote as { businesses?: unknown } | null)?.businesses) ?? "Unnamed",
        // A payout row exists from the moment the goods arrive, so the status
        // that matters is whether the money has actually gone out.
        detail: p.paid_at
          ? `Paid · ${money(p.final_cents ?? 0)}`
          : p.final_cents != null
            ? `Weighed · ${money(p.final_cents)}`
            : "Received",
        at: p.created_at,
        href: "/admin/payouts",
        tone: (p.paid_at ? "done" : "active") as StatusTone,
      };
    }),
    ...(feedOrgs.data ?? []).map((o) => ({
      kind: "account" as const,
      title: o.name,
      detail: "Organization signed up",
      at: o.created_at,
      href: "/admin/accounts",
      tone: "waiting" as StatusTone,
    })),
    ...(feedBusinesses.data ?? []).map((b) => ({
      kind: "account" as const,
      title: b.name,
      detail: `${b.business_type === "supplier" ? "Supplier" : "Business"} signed up`,
      at: b.created_at,
      href: "/admin/accounts",
      tone: "waiting" as StatusTone,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const feedPage = feed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveCatalog = (activeCatalog.data ?? []).length > 0;

  const error =
    pendingAccountsCount.error ??
    pendingAgentsCount.error ??
    offeredQuotesCount.error ??
    activeCatalog.error ??
    pipelineCounts.find((r) => r.error)?.error ??
    // The feed is the page's main table now, so a source that failed has to
    // surface rather than silently shortening the list.
    feedRequests.error ??
    feedQuotes.error ??
    feedPayouts.error ??
    feedOrgs.error ??
    feedBusinesses.error;

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

      <Activity events={feedPage} page={page} total={feed.length} />
    </PageIn>
  );
}
