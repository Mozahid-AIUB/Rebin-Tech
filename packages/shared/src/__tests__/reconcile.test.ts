import { countGap, expectedUnits } from "../reconcile";

describe("expectedUnits", () => {
  it("adds up what the quote agreed to buy", () => {
    expect(
      expectedUnits([
        { quantity: 7 },
        { quantity: 3 },
      ]),
    ).toBe(10);
  });

  it("is zero for a quote with no lines", () => {
    expect(expectedUnits([])).toBe(0);
  });
});

// The agent types a count standing at the dock, which is the last moment
// anyone can ask about a gap while both parties are still in the room. After
// that it becomes a phone call.
describe("countGap", () => {
  it("says nothing when the count agrees", () => {
    expect(countGap(10, 10)).toBeNull();
  });

  it("reports how far short a collection fell", () => {
    expect(countGap(10, 7)).toEqual({ direction: "short", by: 3 });
  });

  // Over is worth flagging too, and not only for tidiness: the vendor is owed
  // for what was taken, and a quote that undercounted means an underpayment.
  it("reports an overcount as well", () => {
    expect(countGap(10, 12)).toEqual({ direction: "over", by: 2 });
  });

  // Half-typed input reaches this on every keystroke -- "1" on the way to
  // "10" is not a discrepancy worth shouting about, and neither is an empty
  // field.
  it("stays quiet until there is a real number to compare", () => {
    expect(countGap(10, null)).toBeNull();
    expect(countGap(10, Number.NaN)).toBeNull();
  });

  // A free pickup has no quote behind it. The booked count and the collected
  // count differ on most of them, and nobody is paid either number.
  it("stays quiet when there was nothing agreed to compare against", () => {
    expect(countGap(null, 7)).toBeNull();
    expect(countGap(0, 7)).toBeNull();
  });
});
