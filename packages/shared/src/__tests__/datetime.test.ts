import {
  buildPickupWindow,
  formatUsDate,
  formatUsTimeWindow,
  nextPickupDates,
} from "../datetime";

describe("formatUsDate", () => {
  it("renders MM/DD/YYYY in the facility timezone", () => {
    expect(formatUsDate("2026-08-05T16:00:00Z", "America/New_York")).toBe("08/05/2026");
  });
  it("shifts the calendar day across a timezone boundary", () => {
    expect(formatUsDate("2026-08-06T03:00:00Z", "America/Los_Angeles")).toBe("08/05/2026");
  });
});

describe("formatUsTimeWindow", () => {
  it("renders a 12-hour range", () => {
    expect(
      formatUsTimeWindow("2026-08-05T13:00:00Z", "2026-08-05T16:00:00Z", "America/New_York"),
    ).toBe("9:00 AM – 12:00 PM");
  });
});

// The pickup wizard collects a calendar date and a named slot ("8 – 11 AM").
// pickup_requests stores two timestamptz columns, so those have to become real
// instants -- and 8 AM at the facility is a different UTC instant in January
// than in August. Getting this wrong dispatches an agent an hour off.
describe("buildPickupWindow", () => {
  it("converts a slot on a summer date using the zone's DST offset", () => {
    expect(buildPickupWindow("2026-08-20", "08:00-11:00", "America/New_York")).toEqual({
      windowStart: "2026-08-20T12:00:00.000Z",
      windowEnd: "2026-08-20T15:00:00.000Z",
    });
  });

  it("converts the same slot on a winter date using standard time", () => {
    expect(buildPickupWindow("2026-01-15", "08:00-11:00", "America/New_York")).toEqual({
      windowStart: "2026-01-15T13:00:00.000Z",
      windowEnd: "2026-01-15T16:00:00.000Z",
    });
  });

  it("honours a different facility timezone", () => {
    expect(buildPickupWindow("2026-08-20", "13:00-16:00", "America/Los_Angeles")).toEqual({
      windowStart: "2026-08-20T20:00:00.000Z",
      windowEnd: "2026-08-20T23:00:00.000Z",
    });
  });
});

// S26 requires the earliest bookable date to be two business days out --
// dispatch needs the lead time, and offering a Saturday would be a slot no
// agent can serve.
describe("nextPickupDates", () => {
  it("starts two business days after a mid-week request", () => {
    // 2026-08-19 is a Wednesday.
    expect(nextPickupDates("2026-08-19", 3)).toEqual(["2026-08-21", "2026-08-24", "2026-08-25"]);
  });

  it("skips the weekend when the lead time falls across it", () => {
    // 2026-08-20 is a Thursday: +2 business days lands on Monday the 24th.
    expect(nextPickupDates("2026-08-20", 2)).toEqual(["2026-08-24", "2026-08-25"]);
  });

  it("never offers a Saturday or Sunday", () => {
    const days = nextPickupDates("2026-08-19", 10).map((d) => new Date(`${d}T12:00:00Z`).getUTCDay());
    expect(days).not.toContain(0);
    expect(days).not.toContain(6);
  });
});
