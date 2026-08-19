"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { grantOperator, revokeOperator } from "../../actions";

/**
 * Grant access to an account that already exists.
 *
 * Takes an e-mail because that is what an operator knows about a colleague.
 * The RPC resolves it to an account and refuses if there is none — which is
 * the honest failure, since this system cannot create a login. Supabase owns
 * passwords, and reaching for a service-role key to create one would put a
 * key that bypasses every RLS policy inside this application.
 */
export function AddOperator() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  return (
    <div className="panel">
      <h2 className="panel-title">Add an operator</h2>
      <p className="chart-note" style={{ margin: "0 0 1rem" }}>
        They sign up first, with the email below. Then adding them here gives
        them the console.
      </p>

      {error && <p className="notice">{error}</p>}
      {done && (
        <p className="admin-sub" style={{ margin: "0 0 0.75rem" }}>
          {done} can now reach the console.
        </p>
      )}

      <div className="btn-row">
        <input
          className="cell-input"
          style={{ width: "18rem" }}
          type="email"
          placeholder="colleague@rebintech.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email of the person to grant access to"
        />
        <button
          className="btn btn-primary"
          disabled={pending || email.trim() === ""}
          onClick={() => {
            setError(null);
            setDone(null);
            startTransition(async () => {
              const result = await grantOperator(email.trim());
              if (!result.ok) {
                setError(result.message);
                return;
              }
              setDone(email.trim());
              setEmail("");
              router.refresh();
            });
          }}
        >
          {pending ? "Granting…" : "Grant access"}
        </button>
      </div>
    </div>
  );
}

/**
 * Take access away.
 *
 * Two clicks, because this is the one control on the screen whose mistake an
 * operator cannot undo from the console they were just removed from — and the
 * person it removes is a colleague who will notice.
 */
export function OperatorActions({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return <p className="notice">{error}</p>;
  }

  if (!confirming) {
    return (
      <button className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>
        Remove
      </button>
    );
  }

  return (
    <div className="btn-row" style={{ justifyContent: "flex-end" }}>
      <button
        className="btn btn-danger btn-sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await revokeOperator(userId);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            router.refresh();
          });
        }}
        aria-label={`Confirm removing ${name}`}
      >
        {pending ? "Removing…" : "Yes, remove"}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
        Keep
      </button>
    </div>
  );
}
