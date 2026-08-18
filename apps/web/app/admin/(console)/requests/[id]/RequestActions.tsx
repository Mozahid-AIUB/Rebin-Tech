"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceRequest, cancelRequest } from "../../../actions";
import { ACTION_LABEL, LEGAL_NEXT } from "@/lib/transitions";
import type { RequestStatus } from "@/lib/supabase/types";

/**
 * The moves available from here -- and only those.
 *
 * `LEGAL_NEXT` mirrors the transition table in `advance_pickup_request`, so a
 * status with nowhere to go renders no buttons rather than a disabled row of
 * them. There is deliberately no free status dropdown: most of its values
 * would be rejected by the database, and an interface whose controls usually
 * fail is one an operator learns to distrust.
 */
export function RequestActions({
  requestId,
  status,
}: {
  requestId: string;
  status: RequestStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const next = LEGAL_NEXT[status];
  if (next.length === 0) return null;

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

  return (
    <div className="panel">
      <h2 className="panel-title">Next step</h2>

      {error && <p className="notice">{error}</p>}

      <div className="btn-row">
        {next.map((target) =>
          target === "cancelled" ? (
            <button
              key={target}
              className="btn btn-danger"
              disabled={pending}
              onClick={() => run(() => cancelRequest(requestId))}
            >
              {ACTION_LABEL.cancelled}
            </button>
          ) : (
            <button
              key={target}
              className="btn btn-primary"
              disabled={pending}
              onClick={() => run(() => advanceRequest(requestId, target))}
            >
              {ACTION_LABEL[target]}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
