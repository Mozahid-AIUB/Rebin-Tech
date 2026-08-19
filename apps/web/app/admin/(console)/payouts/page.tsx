import { createClient } from "@/lib/supabase/server";
import { When, Empty } from "../../ui";
import { PageIn } from "../../Motion";
import { PayoutRow } from "./PayoutRow";

export const dynamic = "force-dynamic";

/** Days since a consignment arrived. The promise is seven. */
function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/**
 * Who is owed money, oldest first.
 *
 * The client promises a payout within seven days of a shipment arriving, so
 * the number that matters on this screen is not how many payouts exist but how
 * long the oldest unpaid one has waited. Sorting by arrival puts that row at
 * the top and keeps it there until somebody deals with it.
 */
export default async function PayoutsPage() {
  const supabase = await createClient();

  // Cast past the generated types: payouts arrived in 0038 and
  // types.gen.ts cannot be regenerated -- the CLI has no access to this
  // project. The row shape below is hand-written from that migration.
  const { data, error } = await supabase
    .from("payouts" as never)
    .select(
      "id, quote_id, received_at, actual_weight_g, final_cents, paid_at, reference, quotes(total_cents, business_id, businesses(name))",
    )
    .order("received_at", { ascending: true });

  const rows = (data ?? []) as unknown as {
    id: string;
    quote_id: string;
    received_at: string;
    actual_weight_g: number | null;
    final_cents: number | null;
    paid_at: string | null;
    reference: string | null;
    quotes: { total_cents: number; businesses: { name: string } | null } | null;
  }[];

  const unpaid = rows.filter((r) => r.paid_at === null);
  const paid = rows.filter((r) => r.paid_at !== null);
  const oldest = unpaid.length ? daysSince(unpaid[0]!.received_at) : 0;

  return (
    <PageIn>
      <div className="admin-head">
        <h1 className="admin-h1">Payouts</h1>
        <span className="admin-count">
          {unpaid.length} awaiting payment
          {unpaid.length > 0 ? ` · oldest ${oldest}d` : ""}
        </span>
      </div>

      <p className="admin-sub">
        A supplier is promised payment within seven days of their shipment
        reaching the warehouse. Recording a payment here does not send one --
        the transfer happens at your bank, and this is the record that it did.
      </p>

      {error && <p className="notice">Could not load payouts: {error.message}</p>}

      <div className="table-wrap">
        {unpaid.length === 0 ? (
          <Empty
            title="Nobody waiting"
            hint="Every consignment that has arrived has been weighed and paid."
          />
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Arrived</th>
                <th>Waiting</th>
                <th>Estimated</th>
                <th>Weighed</th>
                <th>Final</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {unpaid.map((row) => (
                <PayoutRow
                  key={row.id}
                  quoteId={row.quote_id}
                  business={row.quotes?.businesses?.name ?? "—"}
                  receivedAt={row.received_at}
                  days={daysSince(row.received_at)}
                  estimatedCents={row.quotes?.total_cents ?? null}
                  actualWeightG={row.actual_weight_g}
                  finalCents={row.final_cents}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {paid.length > 0 && (
        <>
          <div className="admin-head" style={{ marginTop: "2rem" }}>
            <h2 className="admin-h1">Paid</h2>
            <span className="admin-count">{paid.length}</span>
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Paid</th>
                  <th>Amount</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((row) => (
                  <tr key={row.id}>
                    <td className="cell-name">{row.quotes?.businesses?.name ?? "—"}</td>
                    <td><When value={row.paid_at} /></td>
                    <td className="cell-mono">
                      {row.final_cents != null
                        ? `$${(row.final_cents / 100).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="cell-dim">{row.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageIn>
  );
}
