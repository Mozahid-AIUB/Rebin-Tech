import { formatWeight, gramsToLbs, lbsToGrams } from "../weight";

describe("weight conversion", () => {
  it("converts grams to lbs at one decimal", () => expect(gramsToLbs(5000)).toBe(11.0));
  it("rounds to one decimal", () => expect(gramsToLbs(1234)).toBe(2.7));
  it("handles zero", () => expect(gramsToLbs(0)).toBe(0));
  it("converts lbs back to whole grams", () => expect(lbsToGrams(10)).toBe(4536));
  it("formats with a unit suffix", () => expect(formatWeight(5624)).toBe("12.4 lbs"));
  it("formats zero weight", () => expect(formatWeight(0)).toBe("0.0 lbs"));
});
