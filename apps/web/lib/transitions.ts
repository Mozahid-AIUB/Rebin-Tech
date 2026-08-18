import type { RequestStatus } from "./supabase/types";

/**
 * The transition graph `advance_pickup_request` enforces, mirrored here so the
 * interface can offer exactly the moves the database will accept.
 *
 * This is a copy of a rule that lives in 0016_request_lifecycle.sql, and the
 * copy is deliberate: the authority is the function, which re-checks every
 * transition and raises 22023 on an illegal one. Nothing here can grant a move
 * the database would refuse. What it buys is an interface that never offers a
 * button that errors -- an admin panel whose controls mostly fail is one whose
 * operators stop trusting any of them.
 *
 * If the SQL changes, this must change with it. The end-to-end check is that
 * every button rendered here succeeds against the real database.
 */
export const LEGAL_NEXT: Record<RequestStatus, RequestStatus[]> = {
  pending: ["under_review", "cancelled"],
  under_review: ["scheduled", "cancelled"],
  scheduled: ["dispatched", "cancelled"],
  dispatched: ["in_transit", "cancelled"],
  // No cancel: once a van is loaded and moving, stopping it is a support call.
  in_transit: ["completed"],
  completed: [],
  cancelled: [],
};

/** The happy path, in order. `cancelled` is not on it -- it leaves the line. */
export const PIPELINE: RequestStatus[] = [
  "pending",
  "under_review",
  "scheduled",
  "dispatched",
  "in_transit",
  "completed",
];

/** Sentence-case for reading; the enum's underscores are for Postgres. */
export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  under_review: "Under review",
  scheduled: "Scheduled",
  dispatched: "Dispatched",
  in_transit: "In transit",
  completed: "Completed",
  cancelled: "Cancelled",
};

/**
 * What the operator is being asked to do, rather than what the status is
 * called. The button that moves a request to `under_review` reads "Start
 * review", because the operator is starting one -- naming it after the
 * resulting enum value describes the database's state, not their action.
 */
export const ACTION_LABEL: Record<RequestStatus, string> = {
  pending: "Reopen",
  under_review: "Start review",
  scheduled: "Schedule",
  dispatched: "Dispatch",
  in_transit: "Mark in transit",
  completed: "Mark collected",
  cancelled: "Cancel",
};

/** Waiting, moving, done, or stopped -- which drives the only colour used. */
export type StatusTone = "waiting" | "active" | "done" | "stopped";

export function toneFor(status: RequestStatus): StatusTone {
  if (status === "completed") return "done";
  if (status === "cancelled") return "stopped";
  if (status === "pending" || status === "under_review") return "waiting";
  return "active";
}
