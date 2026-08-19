import { createClient } from "@/lib/supabase/server";
import { getStaffUser } from "@/lib/supabase/server";
import { When, Empty } from "../../ui";
import { PageIn } from "../../Motion";
import { PeopleTabs } from "../PeopleTabs";
import { AddOperator, OperatorActions } from "./OperatorControls";

export const dynamic = "force-dynamic";

/**
 * Who can operate this console.
 *
 * Granting platform access used to mean opening the SQL editor and inserting
 * a role assignment by hand -- a task needing database credentials, leaving no
 * audit trail, and failing silently on a mistyped uuid.
 *
 * There is deliberately no way to sign up as an operator. An account that
 * approves businesses, moves money and reprices the catalog is issued by
 * someone who already holds that power. Supabase owns passwords, so the
 * person signs up through the normal front door first and an existing
 * operator grants them access here.
 */
export default async function OperatorsPage() {
  const supabase = await createClient();
  const me = await getStaffUser();

  const { data, error } = await supabase.rpc("list_operators" as never);

  const rows = (data ?? []) as unknown as {
    user_id: string;
    full_name: string;
    email: string;
    roles: string[];
    granted_at: string;
    is_self: boolean;
  }[];

  return (
    <PageIn>
      <div className="admin-head">
        <h1 className="admin-h1">People</h1>
        <span className="admin-count">{rows.length}</span>
      </div>

      <PeopleTabs current="/admin/operators" />

      <p className="admin-sub">
        Everyone who can reach this console. Access is granted by someone who
        already has it — there is no sign-up for an operator account, because
        an account that can approve a business and record a payment should
        never be self-issued.
      </p>

      {error && <p className="notice">Could not load operators: {error.message}</p>}

      <AddOperator />

      <div className="table-wrap">
        {rows.length === 0 ? (
          <Empty
            title="No operators listed"
            hint="If you are reading this, your own access predates this screen."
          />
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Access since</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id}>
                  <td className="cell-name">
                    {row.full_name}
                    {row.user_id === me?.id && (
                      <span className="kind" style={{ marginLeft: "0.5rem" }}>
                        you
                      </span>
                    )}
                  </td>
                  <td className="cell-mono cell-dim">{row.email}</td>
                  <td>
                    <When value={row.granted_at} />
                  </td>
                  <td className="cell-actions">
                    {/* No control on your own row: removing your own access
                        locks you out mid-session, and the console that just
                        refused you is not where you would fix it. The RPC
                        refuses it too. */}
                    {row.user_id !== me?.id && (
                      <OperatorActions userId={row.user_id} name={row.full_name} />
                    )}
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
