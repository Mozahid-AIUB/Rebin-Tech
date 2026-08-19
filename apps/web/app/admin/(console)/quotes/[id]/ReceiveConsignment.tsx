"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { recordConsignmentReceived } from "../../../actions";

/**
 * The step that starts a payout.
 *
 * An accepted quote is a promise; a pallet on the dock is the thing that
 * actually owes somebody money. Nothing in the product knew about the second
 * until an operator said so, which is why this button exists here rather than
 * on the payouts screen -- the payouts queue can only list consignments that
 * have already arrived, so a button there would have had nothing to act on.
 *
 * Once recorded, this quote leaves this screen alone and becomes a row on
 * /admin/payouts, where it is weighed and paid.
 */
export function ReceiveConsignment({
  quoteId,
  alreadyReceived,
}: {
  quoteId: string;
  alreadyReceived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  if (alreadyReceived) {
    return (
      <div className="panel">
        <h2 className="panel-title">Consignment</h2>
        <p className="admin-sub" style={{ margin: 0 }}>
          Recorded as received. It is now on the{" "}
          <Link href="/admin/payouts">payouts queue</Link> to be weighed and
          paid.
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Consignment</h2>
      <p className="admin-sub" style={{ margin: "0 0 0.875rem" }}>
        Record this when the shipment reaches the warehouse. That starts the
        seven days the supplier was promised — counted from arrival, not from
        the day they accepted.
      </p>

      {error && <p className="notice">{error}</p>}

      <div className="btn-row">
        <input
          className="cell-input"
          style={{ width: "16rem" }}
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-label="Notes about this consignment"
        />
        <button
          className="btn btn-primary"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await recordConsignmentReceived(quoteId, notes || null);
              if (!result.ok) {
                setError(result.message);
                return;
              }
              router.refresh();
            });
          }}
        >
          {pending ? "Recording…" : "Mark as received"}
        </button>
      </div>
    </div>
  );
}
