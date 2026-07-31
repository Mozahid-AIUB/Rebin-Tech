import { formatUsDate, formatUsTimeWindow } from "../datetime";

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
