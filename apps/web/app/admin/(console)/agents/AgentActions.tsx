"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAccountStatus } from "../../actions";
import type { AccountStatus } from "@/lib/supabase/types";

/**
 * The one move available from each status -- and only that one.
 *
 * `set_agent_status` (0015) does not enforce a transition graph the way
 * `advance_pickup_request` does; it accepts any `account_status_enum`. The
 * restraint is entirely this table, mirroring how `RequestActions` derives
 * its buttons from `LEGAL_NEXT` instead of offering a free-form dropdown: a
 * console that renders every status as a clickable target invites an
 * operator to reject an already-active agent or "approve" one who was
 * rejected for cause. `rejected` and `archived` are terminal here on
 * purpose, even though the database would accept a further move -- an
 * operator who needs to undo either of those is a support case, not a click.
 */
const NEXT: Partial<Record<AccountStatus, { label: string; target: AccountStatus; kind: "primary" | "danger" }[]>> = {
  pending_verification: [
    { label: "Approve", target: "active", kind: "primary" },
    { label: "Reject", target: "rejected", kind: "danger" },
  ],
  active: [{ label: "Suspend", target: "suspended", kind: "danger" }],
  suspended: [{ label: "Reinstate", target: "active", kind: "primary" }],
};

export function AgentActions({
  userId,
  name,
  status,
}: {
  userId: string;
  name: string;
  status: AccountStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const moves = NEXT[status];
  if (!moves || moves.length === 0) return null;

  function decide(target: AccountStatus) {
    setError(null);
    startTransition(async () => {
      const result = await setAccountStatus("agent", userId, target);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {error && <p className="notice">{error}</p>}
      <div className="btn-row" style={{ justifyContent: "flex-end" }}>
        {moves.map((move) => (
          <button
            key={move.target}
            className={`btn btn-${move.kind} btn-sm`}
            disabled={pending}
            onClick={() => decide(move.target)}
            aria-label={`${move.label} ${name}`}
          >
            {move.label}
          </button>
        ))}
      </div>
    </>
  );
}
