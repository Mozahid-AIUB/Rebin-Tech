import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { When, Empty, AccountStatusDot } from "../../ui";
import { PageIn } from "../../Motion";
import { AccountActions } from "./AccountActions";
import type { AccountStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

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

  return (
    <PageIn>
      <div className="admin-head">
        <h1 className="admin-h1">Accounts</h1>
        <span className="admin-count">{rows.length} waiting</span>
      </div>

      <p className="admin-sub">
        Organizations and businesses, waiting to be let in. Approving one
        also activates the people who belong to it; rejecting leaves the
        account in place but signed out of the product. Agents are reviewed
        separately, on the <Link href="/admin/agents">Agents screen</Link>.
      </p>

      {error && <p className="notice">Could not load the queue: {error.message}</p>}

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
                    <span className="kind">{row.kind}</span>
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
