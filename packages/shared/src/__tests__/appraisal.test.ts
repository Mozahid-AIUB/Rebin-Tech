import { appraisalResultSchema, lineTotalCents, quoteTotalCents } from "../schemas/appraisal";

// The business scan returns what a thing is and how good a shape it is in.
// What it is worth comes from the catalog, never from the model (plan §6).
describe("appraisalResultSchema", () => {
  const item = {
    componentKey: "laptop_business",
    quantity: 3,
    confidence: 92,
    notes: "Dell Latitude, powers on",
  };

  it("accepts an identified lot", () => {
    expect(appraisalResultSchema.safeParse({ items: [item] }).success).toBe(true);
  });

  // A model that returns a price is a model that has to be retrained to change
  // one, and a quote nobody can explain. The schema refuses to carry one.
  it("ignores a price the model tried to volunteer", () => {
    const parsed = appraisalResultSchema.safeParse({
      items: [{ ...item, unitPriceCents: 9999 }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items[0]).not.toHaveProperty("unitPriceCents");
    }
  });

  it("rejects a quantity below one", () => {
    expect(appraisalResultSchema.safeParse({ items: [{ ...item, quantity: 0 }] }).success).toBe(
      false,
    );
  });
});

describe("lineTotalCents", () => {
  it("multiplies the catalog price by the quantity", () => {
    expect(lineTotalCents(12000, 3)).toBe(36000);
  });

  // Zero is a real price: hazardous items are accepted at no charge rather
  // than refused, and that has to total cleanly rather than being treated as
  // a missing price.
  it("keeps a zero-priced line at zero", () => {
    expect(lineTotalCents(0, 5)).toBe(0);
  });
});

describe("quoteTotalCents", () => {
  it("sums every line", () => {
    expect(
      quoteTotalCents([
        { unitPriceCents: 12000, quantity: 3 },
        { unitPriceCents: 2500, quantity: 2 },
      ]),
    ).toBe(41000);
  });

  it("is zero for an empty quote", () => {
    expect(quoteTotalCents([])).toBe(0);
  });
});
