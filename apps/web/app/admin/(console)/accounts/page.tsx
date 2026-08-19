import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { When, Empty, AccountStatusDot } from "../../ui";
import { PageIn } from "../../Motion";
import { PeopleTabs } from "../PeopleTabs";
import { AccountActions } from "./AccountActions";
import type { AccountStatus } from "@/lib/supabase/types";
import type { BusinessType } from "@rebin/shared";

export const dynamic = "force-dynamic";

/**
 * Readable, not a raw enum. `it_reseller` on a queue an operator scans every
 * morning is a value they'd have to decode; the paperwork question this
 * column exists to answer deserves plain words, especially for `supplier`
 * -- the one type this queue was extended to call out.
 */
const TYPE_LABEL: Record<BusinessType, string> = {
  repair_shop: "Repair shop",
  electronics_retailer: "Electronics retailer",
  scrap_dealer: "Scrap dealer",
  it_reseller: "IT reseller",
  refurbisher: "Refurbisher",
  supplier: "Supplier",
  other: "Other",
};

/**
 * Everyone waiting to be let in -- organizations and businesses only.
 *
 * Reads `pending_accounts`, the view 0015 added for exactly this screen: it
 * unions pending organizations, businesses and agents into one shape, so the
 * queue is one query rather than three joins kept in step by hand. The view
 * is `security_invoker`, so a non-staff caller gets an empty result rather
 * than an error -- the same answer the RLS policies would give.
 *
 * Agents are excluded here with `.neq("kind", "agent")`, at the query rather
 * than in JS: they have their own screen, `/admin/agents`, governed by
 * `set_agent_status`'s status-transition table rather than the unconditional
 * approve/reject this screen offers. Reading the same rows through two
 * screens with two different controls is how one gets overruled by the
 * other. Filtering here also keeps this screen's count in step with the
 * overview's "Accounts waiting" tile, which links here and counts the same
 * two kinds (see `page.tsx`).
 */
export default async function AccountsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pending_accounts")
    .select("kind, id, name, status, created_at")
    .neq("kind", "agent")
    .order("created_at", { ascending: true });

  const rows = (data ?? []).filter(
    (r): r is { kind: string; id: string; name: string; status: AccountStatus; created_at: string } =>
      r.kind !== null && r.id !== null && r.name !== null && r.status !== null && r.created_at !== null,
  );

  // pending_accounts returns kind but not business_type -- a business and a
  // supplier are indistinguishable in the view, and the paperwork differs
  // between them (a business has an EIN, a supplier has none). Fetched only
  // for the business rows actually on screen, and mapped by id.
  const businessIds = rows.filter((r) => r.kind === "business").map((r) => r.id);

  const { data: types, error: typesError } = businessIds.length
    ? await supabase.from("businesses").select("id, business_type").in("id", businessIds)
    : { data: [], error: null };

  const typeFor = new Map((types ?? []).map((t) => [t.id, t.business_type]));

  return (
    <PageIn>
      <div className="admin-head">
        <h1 className="admin-h1">People</h1>
        <span className="admin-count">{rows.length} waiting</span>
      </div>

      <PeopleTabs current="/admin/accounts" />

      <p className="admin-sub">
        Organizations and businesses, waiting to be let in. Approving one
        also activates the people who belong to it; rejecting leaves the
        account in place but signed out of the product. Agents are reviewed
        separately, on the <Link href="/admin/agents">Agents screen</Link>.
      </p>

      {error && <p className="notice">Could not load the queue: {error.message}</p>}
      {!error && typesError && (
        <p className="notice">
          Queue loaded, but business types could not: {typesError.message}. Every
          business below may be showing as a plain business, supplier or not.
        </p>
      )}

      <div className="table-wrap">
        {rows.length === 0 ? (
          <Empty
            title="Nobody waiting"
            hint="Every registered account has been reviewed."
          />
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Status</th>
                <th>Registered</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.kind}-${row.id}`}>
                  <td>
                    <span className="kind">
                      {row.kind === "business"
                        ? (() => {
                            const t = typeFor.get(row.id);
                            return t ? TYPE_LABEL[t] : "Business";
                          })()
                        : row.kind}
                    </span>
                  </td>
                  <td className="cell-name">{row.name}</td>
                  <td>
                    <AccountStatusDot status={row.status} />
                  </td>
                  <td>
                    <When value={row.created_at} />
                  </td>
                  <td className="cell-actions">
                    <AccountActions kind={row.kind} id={row.id} name={row.name} />
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
