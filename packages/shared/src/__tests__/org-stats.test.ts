import { summarisePickupRequests, summariseQuotes } from "../org-stats";

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


// The business home answers three questions at a glance: what is still on the
// table, what it is worth, and what has actually been agreed.
describe("summariseQuotes", () => {
  const QUOTES = [
    { status: "offered" as const, totalCents: 36000 },
    { status: "offered" as const, totalCents: 4000 },
    { status: "accepted" as const, totalCents: 25000 },
    { status: "declined" as const, totalCents: 9000 },
    { status: "expired" as const, totalCents: 7000 },
  ];

  it("counts only live offers as open", () => {
    expect(summariseQuotes(QUOTES).openCount).toBe(2);
  });

  it("values only what is still on the table", () => {
    // Declined and expired offers are not money anyone can still take.
    expect(summariseQuotes(QUOTES).openValueCents).toBe(40000);
  });

  it("totals what has been agreed", () => {
    expect(summariseQuotes(QUOTES).acceptedValueCents).toBe(25000);
  });

  it("is all zeroes before the first quote", () => {
    expect(summariseQuotes([])).toEqual({
      openCount: 0,
      openValueCents: 0,
      acceptedValueCents: 0,
    });
  });
});
