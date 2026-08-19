"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gramsToLbs, lbsToGrams } from "@rebin/shared";
import { recordConsignmentWeighed, recordPayoutPaid } from "../../actions";

/**
 * One consignment, at whichever of its two remaining steps it has reached.
 *
 * A row is either waiting to be weighed or waiting to be paid, never both, so
 * it shows one set of controls rather than a form with half its fields
 * disabled. Paying is refused by the database until a weight is recorded --
 * this only declines to offer the button, which is the same rule stated twice
 * in the two places it needs stating.
 */
export function PayoutRow({
  quoteId,
  business,
  receivedAt,
  days,
  estimatedCents,
  actualWeightG,
  finalCents,
}: {
  quoteId: string;
  business: string;
  receivedAt: string;
  days: number;
  estimatedCents: number | null;
  actualWeightG: number | null;
  finalCents: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lbs, setLbs] = useState("");
  const [dollars, setDollars] = useState("");
  const [reference, setReference] = useState("");

  const weighed = finalCents != null;

  function run(action: () => Promise<{ ok: true } | { ok: false; message: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function weigh() {
    const w = Number.parseFloat(lbs);
    const d = Number.parseFloat(dollars);
    if (!Number.isFinite(w) || w < 0 || !Number.isFinite(d) || d < 0) {
      setError("Enter a weight in pounds and an amount in dollars.");
      return;
    }
    run(() =>
      recordConsignmentWeighed({
        quoteId,
        actualWeightG: lbsToGrams(w),
        // Cents from dollars, rounded once here rather than parsed back out of
        // a formatted string later.
        finalCents: Math.round(d * 100),
      }),
    );
  }

  return (
    <tr>
      <td className="cell-name">{business}</td>
      <td>
        <span className="cell-mono cell-dim">
          {new Date(receivedAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            timeZone: "UTC",
          })}
        </span>
      </td>
      <td>
        {/* Past seven days the promise is broken, so the number stops being
            neutral information and starts being the reason to act. */}
        <span className="status" data-tone={days >= 7 ? "waiting" : "active"}>
          {days}d
        </span>
      </td>
      <td className="cell-mono cell-dim">
        {estimatedCents != null ? `$${(estimatedCents / 100).toFixed(2)}` : "—"}
      </td>
      <td className="cell-mono">
        {actualWeightG != null ? `${gramsToLbs(actualWeightG)} lb` : "—"}
      </td>
      <td className="cell-mono">
        {finalCents != null ? `$${(finalCents / 100).toFixed(2)}` : "—"}
      </td>
      <td className="cell-actions">
        {error && <p className="notice">{error}</p>}

        {!weighed ? (
          <div className="btn-row" style={{ justifyContent: "flex-end" }}>
            <input
              className="cell-input"
              placeholder="lb"
              value={lbs}
              onChange={(e) => setLbs(e.target.value)}
              inputMode="decimal"
              aria-label={`Weight in pounds for ${business}`}
            />
            <input
              className="cell-input"
              placeholder="$"
              value={dollars}
              onChange={(e) => setDollars(e.target.value)}
              inputMode="decimal"
              aria-label={`Final amount for ${business}`}
            />
            <button className="btn btn-primary btn-sm" disabled={pending} onClick={weigh}>
              Record weight
            </button>
          </div>
        ) : (
          <div className="btn-row" style={{ justifyContent: "flex-end" }}>
            <input
              className="cell-input"
              placeholder="Bank reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              aria-label={`Payment reference for ${business}`}
            />
            <button
              className="btn btn-primary btn-sm"
              disabled={pending}
              onClick={() => run(() => recordPayoutPaid(quoteId, reference || null))}
            >
              Mark paid
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
