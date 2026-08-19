"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOperator, grantOperator, revokeOperator } from "../../actions";

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
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // Two ways in, because there are two situations. Usually the colleague has
  // no account at all and the console should just make one. Occasionally they
  // already signed up as something else -- a business owner being promoted --
  // and creating a second account under the same address would fail anyway.
  const [mode, setMode] = useState<"create" | "existing">("create");

  const reset = (label: string) => {
    setDone(label);
    setEmail("");
    setPassword("");
    setFullName("");
    router.refresh();
  };

  return (
    <div className="panel">
      <h2 className="panel-title">Add an operator</h2>

      <div className="filters" style={{ marginBottom: "0.875rem" }}>
        <button
          className="filter"
          aria-current={mode === "create"}
          onClick={() => { setMode("create"); setError(null); }}
        >
          Create an account
        </button>
        <button
          className="filter"
          aria-current={mode === "existing"}
          onClick={() => { setMode("existing"); setError(null); }}
        >
          Grant an existing one
        </button>
      </div>

      <p className="chart-note" style={{ margin: "0 0 1rem" }}>
        {mode === "create"
          ? "Creates the account and gives it the console straight away. Tell them the password you set here — they can change it after signing in."
          : "For someone who already has an account in this product. Their email is all that is needed."}
      </p>

      {error && <p className="notice">{error}</p>}
      {done && (
        <p className="admin-sub" style={{ margin: "0 0 0.75rem" }}>
          {done} can now reach the console.
        </p>
      )}

      {mode === "create" ? (
        <div className="btn-row">
          <input
            className="cell-input"
            style={{ width: "11rem" }}
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-label="Their name"
          />
          <input
            className="cell-input"
            style={{ width: "16rem" }}
            type="email"
            placeholder="colleague@rebintech.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Their email"
          />
          <input
            className="cell-input"
            style={{ width: "12rem" }}
            type="text"
            placeholder="Password (10+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="A password for their account"
          />
          <button
            className="btn btn-primary"
            disabled={pending || email.trim() === "" || password.length < 10}
            onClick={() => {
              setError(null);
              setDone(null);
              startTransition(async () => {
                const result = await createOperator({
                  email: email.trim(),
                  password,
                  fullName: fullName.trim(),
                });
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                reset(fullName.trim() || email.trim());
              });
            }}
          >
            {pending ? "Creating…" : "Create operator"}
          </button>
        </div>
      ) : (
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
                reset(email.trim());
              });
            }}
          >
            {pending ? "Granting…" : "Grant access"}
          </button>
        </div>
      )}
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
