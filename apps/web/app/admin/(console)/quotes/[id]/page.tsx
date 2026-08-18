import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { effectiveQuoteStatus } from "@/lib/quotes";
import { formatCents, GRADE_LABEL, UNIT_LABEL } from "@/lib/pricing";
import { QuoteStatusDot, When } from "../../../ui";
import { PageIn } from "../../../Motion";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <>
        <Link href="/admin/quotes" className="back">
          <span className="back-arrow" aria-hidden="true">←</span> Quotes
        </Link>
        <p className="notice">Could not load this quote: {error.message}</p>
      </>
    );
  }

  if (!quote) notFound();

  const [{ data: business }, { data: items }] = await Promise.all([
    supabase.from("businesses").select("name, city, state").eq("id", quote.business_id).maybeSingle(),
    supabase
      .from("quote_items")
      .select("id, display_name, grade, unit, quantity, unit_price_cents, line_total_cents")
      .eq("quote_id", id)
      .order("display_name", { ascending: true }),
  ]);

  const status = effectiveQuoteStatus(quote.status, quote.expires_at);
  const rows = items ?? [];

  return (
    <PageIn>
      <Link href="/admin/quotes" className="back">
        <span className="back-arrow" aria-hidden="true">←</span> Quotes
      </Link>

      <div className="admin-head">
        <h1 className="admin-h1">{business?.name ?? "Quote"}</h1>
        <QuoteStatusDot status={status} />
      </div>

      <div className="panel">
        <h2 className="panel-title">Offer</h2>
        <dl className="facts">
          <div className="fact">
            <dt>Business</dt>
            <dd>{business ? `${business.name} — ${business.city}, ${business.state}` : "—"}</dd>
          </div>
          <div className="fact">
            <dt>Total</dt>
            <dd className="mono">{formatCents(quote.total_cents)}</dd>
          </div>
          <div className="fact">
            <dt>Items</dt>
            <dd className="mono">{rows.length}</dd>
          </div>
          <div className="fact">
            <dt>Expires</dt>
            <dd className="mono">
              <When value={quote.expires_at} />
            </dd>
          </div>
          <div className="fact">
            <dt>Decided</dt>
            <dd className="mono">
              <When value={quote.decided_at} />
            </dd>
          </div>
          <div className="fact">
            <dt>Created</dt>
            <dd className="mono">
              <When value={quote.created_at} />
            </dd>
          </div>
        </dl>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Grade</th>
              <th>Unit</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Line total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td className="cell-name">{item.display_name}</td>
                <td>{GRADE_LABEL[item.grade]}</td>
                <td>{UNIT_LABEL[item.unit]}</td>
                <td className="cell-mono">{item.quantity}</td>
                <td className="cell-mono">{formatCents(item.unit_price_cents)}</td>
                <td className="cell-mono">{formatCents(item.line_total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageIn>
  );
}
