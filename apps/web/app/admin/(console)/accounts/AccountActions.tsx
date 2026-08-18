"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAccountStatus } from "../../actions";

/**
 * Approve or reject, in the row.
 *
 * Both are one click with no confirmation step. Approving is reversible --
 * the same RPCs move an account back to `suspended` or `rejected` -- and a
 * queue whose every row costs two clicks is a queue operators batch up and
 * stop working through.
 */
export function AccountActions({
  kind,
  id,
  name,
}: {
  kind: string;
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(status: "active" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await setAccountStatus(kind, id, status);
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
        <button
          className="btn btn-primary btn-sm"
          disabled={pending}
          onClick={() => decide("active")}
          aria-label={`Approve ${name}`}
        >
          Approve
        </button>
        <button
          className="btn btn-danger btn-sm"
          disabled={pending}
          onClick={() => decide("rejected")}
          aria-label={`Reject ${name}`}
        >
          Reject
        </button>
      </div>
    </>
  );
}
