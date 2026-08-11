import type { RequestStatus } from "./enums";

/** Requests the org is still waiting on, as opposed to its history. */
const IN_FLIGHT: readonly RequestStatus[] = [
  "pending",
  "under_review",
  "scheduled",
  "dispatched",
  "in_transit",
];

export type OrgStats = {
  activeCount: number;
  activeDevices: number;
  /** ISO timestamp of the soonest upcoming window, or null if nothing is booked. */
  nextPickup: string | null;
};

/**
 * The three numbers the organization dashboard can honestly show today.
 *
 * Deliberately not "devices recycled" or "certificates issued": no request can
 * reach 'completed' until the field agent portal exists, so both would be a
 * permanent zero dressed up as a statistic.
 *
 * Everything here is derived from requests the org has already made, which is
 * why it needs no extra query -- the dashboard has already loaded them.
 */
export function summarisePickupRequests(
  requests: readonly { status: RequestStatus; unitCount: number; windowStart: string }[],
): OrgStats {
  const active = requests.filter((r) => IN_FLIGHT.includes(r.status));

  return {
    activeCount: active.length,
    activeDevices: active.reduce((sum, r) => sum + r.unitCount, 0),
    // Soonest first. A cancelled pickup next Tuesday is not the next pickup,
    // which is why this reads from `active` rather than from everything.
    nextPickup:
      active
        .map((r) => r.windowStart)
        .sort()
        .at(0) ?? null,
  };
}
