import { formatCents, parseDollars, sumCents } from "../money";

describe("formatCents", () => {
  it("formats whole dollars", () => expect(formatCents(100)).toBe("$1.00"));
  it("formats sub-dollar amounts", () => expect(formatCents(46)).toBe("$0.46"));
  it("formats zero", () => expect(formatCents(0)).toBe("$0.00"));
  it("adds thousands separators", () => expect(formatCents(123456)).toBe("$1,234.56"));
  it("formats negatives as deductions", () => expect(formatCents(-500)).toBe("-$5.00"));
});

describe("parseDollars", () => {
  it("parses a plain decimal", () => expect(parseDollars("12.34")).toBe(1234));
  it("parses with a dollar sign and commas", () => expect(parseDollars("$1,234.56")).toBe(123456));
  it("parses an integer string", () => expect(parseDollars("7")).toBe(700));
  it("rounds half up at the cent", () => expect(parseDollars("0.005")).toBe(1));
  it("throws on non-numeric input", () => expect(() => parseDollars("abc")).toThrow(RangeError));
  it("throws on empty input", () => expect(() => parseDollars("")).toThrow(RangeError));
});

describe("sumCents", () => {
  it("sums an empty list to zero", () => expect(sumCents([])).toBe(0));
  it("sums without float drift", () => expect(sumCents([46, 46, 46])).toBe(138));
});
