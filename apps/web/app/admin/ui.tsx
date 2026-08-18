import { STATUS_LABEL, toneFor, type StatusTone } from "@/lib/transitions";
import type { AccountStatus, RequestStatus, QuoteStatus } from "@/lib/supabase/types";

/** A request's state, as a dot and a word. Colour is the only signal here. */
export function StatusDot({ status }: { status: RequestStatus }) {
  return (
    <span className="status" data-tone={toneFor(status)}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const ACCOUNT_TONE: Record<AccountStatus, StatusTone> = {
  pending_verification: "waiting",
  active: "done",
  suspended: "stopped",
  rejected: "stopped",
  archived: "stopped",
};

const ACCOUNT_LABEL: Record<AccountStatus, string> = {
  pending_verification: "Pending",
  active: "Active",
  suspended: "Suspended",
  rejected: "Rejected",
  archived: "Archived",
};

export function AccountStatusDot({ status }: { status: AccountStatus }) {
  return (
    <span className="status" data-tone={ACCOUNT_TONE[status]}>
      {ACCOUNT_LABEL[status]}
    </span>
  );
}

const QUOTE_TONE: Record<QuoteStatus, StatusTone> = {
  offered: "active",
  accepted: "done",
  declined: "stopped",
  expired: "stopped",
};

const QUOTE_LABEL: Record<QuoteStatus, string> = {
  offered: "Offered",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

/**
 * A quote's state, as a dot and a word.
 *
 * Takes the *effective* status -- already passed through
 * `effectiveQuoteStatus` in `lib/quotes.ts` -- never the raw column. This
 * component does not re-derive it, so every caller must do that derivation
 * itself; that is the contract, not an oversight.
 */
export function QuoteStatusDot({ status }: { status: QuoteStatus }) {
  return (
    <span className="status" data-tone={QUOTE_TONE[status]}>
      {QUOTE_LABEL[status]}
    </span>
  );
}

/**
 * A date an operator can act on.
 *
 * Fixed to en-GB with an explicit timezone rather than the visitor's locale:
 * a server render and a client render that disagree about date format is a
 * hydration mismatch, and two operators reading the same row should see the
 * same string. Pickup windows carry their own timezone in the row; this is
 * for record timestamps, where UTC is the honest answer.
 */
export function When({ value }: { value: string | null }) {
  if (!value) return <span className="cell-dim">—</span>;
  const d = new Date(value);
  return (
    <span className="cell-mono cell-dim">
      {d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      })}
    </span>
  );
}

export function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {hint}
    </div>
  );
}
