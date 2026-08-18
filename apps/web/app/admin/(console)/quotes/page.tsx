import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { effectiveQuoteStatus } from "@/lib/quotes";
import { formatCents } from "@/lib/pricing";
import { QuoteStatusDot, When, Empty } from "../../ui";
import { PageIn } from "../../Motion";
import type { QuoteStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const ALL_STATUSES: QuoteStatus[] = ["offered", "accepted", "declined", "expired"];

const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  offered: "Offered",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

function isStatus(value: string | undefined): value is QuoteStatus {
  return !!value && (ALL_STATUSES as string[]).includes(value);
}

/**
 * Every quote, across every business.
 *
 * `list_quotes` in 0023_quotes.sql does this same read and the same expiry
 * correction, but it is scoped to one business by RLS's own design -- it
 * takes a `p_business_id` because a vendor is only ever meant to see its own
 * offers. Platform staff need the opposite scope, so this screen reads
 * `quotes` and `businesses` directly (RLS's `quotes_read` policy admits
 * platform staff already) and applies the same expiry rule in TypeScript via
 * `effectiveQuoteStatus`, rather than trying to bend a single-business RPC to
 * a cross-business read.
 *
 * The filter is applied against the *effective* status, not the raw column,
 * so "Expired" catches a lapsed offer the database has not yet rewritten.
 */
export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = isStatus(status) ? status : null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quotes")
    .select("id, business_id, status, total_cents, expires_at, created_at, quote_items(id)")
    .order("created_at", { ascending: false });

  const quotes = (data ?? []).map((q) => ({
    id: q.id,
    business_id: q.business_id,
    status: effectiveQuoteStatus(q.status, q.expires_at),
    total_cents: q.total_cents,
    item_count: q.quote_items.length,
    expires_at: q.expires_at,
    created_at: q.created_at,
  }));

  const businessIds = [...new Set(quotes.map((q) => q.business_id))];
  const { data: businesses } = businessIds.length
    ? await supabase.from("businesses").select("id, name").in("id", businessIds)
    : { data: [] };
  const nameFor = new Map((businesses ?? []).map((b) => [b.id, b.name]));

  const rows = filter ? quotes.filter((q) => q.status === filter) : quotes;

  return (
    <PageIn>
      <div className="admin-head">
        <h1 className="admin-h1">Quotes</h1>
        <span className="admin-count">
          {rows.length} {filter ? QUOTE_STATUS_LABEL[filter].toLowerCase() : "total"}
        </span>
      </div>

      <p className="admin-sub">
        A business builds a quote itself, from the published catalog, in the
        mobile app. There is no way to start one here -- this screen only
        reads what a business has already been offered.
      </p>

      <div className="filters">
        <Link href="/admin/quotes" className="filter" aria-current={!filter}>
          All
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/quotes?status=${s}`}
            className="filter"
            aria-current={filter === s}
          >
            {QUOTE_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {error && <p className="notice">Could not load quotes: {error.message}</p>}

      <div className="table-wrap">
        {rows.length === 0 ? (
          <Empty
            title="No quotes here"
            hint={
              filter
                ? "Nothing is at this stage right now."
                : "No business has built a quote from the catalog yet."
            }
          />
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Business</th>
                <th>Total</th>
                <th>Items</th>
                <th>Expires</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <QuoteStatusDot status={row.status} />
                  </td>
                  <td className="cell-name">
                    <Link href={`/admin/quotes/${row.id}`}>
                      {nameFor.get(row.business_id) ?? "—"}
                    </Link>
                  </td>
                  <td className="cell-mono">{formatCents(row.total_cents)}</td>
                  <td className="cell-mono">{row.item_count}</td>
                  <td>
                    <When value={row.expires_at} />
                  </td>
                  <td>
                    <When value={row.created_at} />
                  </td>
                  <td className="cell-actions">
                    <Link href={`/admin/quotes/${row.id}`} className="btn btn-ghost btn-sm">
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
