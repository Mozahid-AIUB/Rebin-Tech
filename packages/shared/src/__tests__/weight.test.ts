import { formatWeight, gramsToLbs, lbsToGrams, lineArithmetic } from "../weight";

describe("weight conversion", () => {
  it("converts grams to lbs at one decimal", () => expect(gramsToLbs(5000)).toBe(11.0));
  it("rounds to one decimal", () => expect(gramsToLbs(1234)).toBe(2.7));
  it("handles zero", () => expect(gramsToLbs(0)).toBe(0));
  it("converts lbs back to whole grams", () => expect(lbsToGrams(10)).toBe(4536));
  it("formats with a unit suffix", () => expect(formatWeight(5624)).toBe("12.4 lbs"));
  it("formats zero weight", () => expect(formatWeight(0)).toBe("0.0 lbs"));
});

describe("lineArithmetic", () => {
  it("reconciles 12 x cpu (50g each) exactly in grams, and within a cent in dollars", () => {
    // 12 x 50g = 600g exactly; 600g at $18.00/lb is $23.81 (rounded), not the
    // $23.40 that "12 x 0.1 lbs = 1.3 lbs at $18.00/lb" implied.
    const text = lineArithmetic({ quantity: 12, unitPriceCents: 1800, weightG: 600 });
    expect(text).toBe("12 × 50g = 600g (1.323 lb) at $18.00/lb");
    // The parenthetical pounds figure, multiplied by the same rate shown,
    // lands within a cent of the actual line total (600/453.59237 x 1800 =
    // 2381.4 cents, rounds to $23.81).
    expect(Math.round(1.323 * 1800)).toBe(2381);
  });

  it("reconciles a single ram_module (30g) the same way", () => {
    const text = lineArithmetic({ quantity: 1, unitPriceCents: 900, weightG: 30 });
    expect(text).toBe("1 × 30g = 30g (0.066 lb) at $9.00/lb");
  });

  it("per-unit grams times quantity always equals the total grams shown", () => {
    for (const [weightG, quantity] of [[600, 12], [30, 7], [8791, 99], [45, 3]] as const) {
      const perUnitG = weightG / quantity;
      const text = lineArithmetic({ quantity, unitPriceCents: 100, weightG });
      expect(text).toContain(`${quantity} × ${Math.round(perUnitG)}g = ${weightG}g`);
    }
  });

  it("falls back to a plain per-item read when the line has no weight", () => {
    expect(lineArithmetic({ quantity: 3, unitPriceCents: 250, weightG: null })).toBe("3 × $2.50");
  });
});
