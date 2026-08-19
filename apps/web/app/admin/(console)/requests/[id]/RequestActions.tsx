"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceRequest, cancelRequest, scheduleRequest } from "../../../actions";
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
  windowStart,
  windowEnd,
}: {
  requestId: string;
  status: RequestStatus;
  windowStart: string;
  windowEnd: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Scheduling asks for the window instead of firing on click. The window the
  // organization asked for is the default, because it is right more often
  // than any date this form could invent -- an operator confirms it or moves
  // it, rather than retyping it.
  const [picking, setPicking] = useState(false);
  const [from, setFrom] = useState(() => toLocalInput(windowStart));
  const [to, setTo] = useState(() => toLocalInput(windowEnd));

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
          target === "scheduled" ? (
            <button
              key={target}
              className="btn btn-primary"
              disabled={pending}
              onClick={() => setPicking((open) => !open)}
            >
              {picking ? "Cancel scheduling" : ACTION_LABEL.scheduled}
            </button>
          ) : target === "cancelled" ? (
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

      {picking && (
        <div className="sched-form">
          <label className="sched-field">
            <span>Collection window opens</span>
            <input
              type="datetime-local"
              className="cell-input"
              style={{ width: "13rem" }}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="sched-field">
            <span>and closes</span>
            <input
              type="datetime-local"
              className="cell-input"
              style={{ width: "13rem" }}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            className="btn btn-primary"
            disabled={pending}
            onClick={() => {
              if (!from || !to) {
                setError("Set both ends of the collection window.");
                return;
              }
              if (new Date(to) <= new Date(from)) {
                setError("The window has to end after it starts.");
                return;
              }
              run(() =>
                scheduleRequest(
                  requestId,
                  new Date(from).toISOString(),
                  new Date(to).toISOString(),
                ),
              );
            }}
          >
            {pending ? "Scheduling…" : "Confirm schedule"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A timestamp in the shape `datetime-local` accepts.
 *
 * The input has no timezone, so this deliberately renders the operator's own
 * local time -- they are picking a slot in the day in front of them. The value
 * goes back out through `new Date(...).toISOString()`, so the offset is
 * reapplied on the way to the database and nothing is stored ambiguously.
 */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
