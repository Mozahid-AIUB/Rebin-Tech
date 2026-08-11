import { summarisePickupRequests } from "../org-stats";

const REQUESTS = [
  { status: "pending" as const, unitCount: 25, windowStart: "2026-08-25T12:00:00.000Z" },
  { status: "scheduled" as const, unitCount: 40, windowStart: "2026-08-20T12:00:00.000Z" },
  { status: "cancelled" as const, unitCount: 10, windowStart: "2026-08-18T12:00:00.000Z" },
  { status: "completed" as const, unitCount: 12, windowStart: "2026-07-01T12:00:00.000Z" },
];

describe("summarisePickupRequests", () => {
  it("counts only the requests still in flight as active", () => {
    // Cancelled and completed ones are history; counting them would tell an
    // org it has four pickups coming when it has two.
    expect(summarisePickupRequests(REQUESTS).activeCount).toBe(2);
  });

  it("totals the devices on those active requests", () => {
    expect(summarisePickupRequests(REQUESTS).activeDevices).toBe(65);
  });

  it("picks the soonest upcoming window as the next pickup", () => {
    expect(summarisePickupRequests(REQUESTS).nextPickup).toBe("2026-08-20T12:00:00.000Z");
  });

  it("has no next pickup when nothing is in flight", () => {
    const done = REQUESTS.filter((r) => r.status === "completed" || r.status === "cancelled");
    const summary = summarisePickupRequests(done);
    expect(summary.nextPickup).toBeNull();
    expect(summary.activeCount).toBe(0);
    expect(summary.activeDevices).toBe(0);
  });

  it("is all zeroes for an org that has never booked", () => {
    expect(summarisePickupRequests([])).toEqual({
      activeCount: 0,
      activeDevices: 0,
      nextPickup: null,
    });
  });
});
