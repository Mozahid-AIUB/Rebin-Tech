import { SIZE_TIERS, orgSignupSchema, pickupRequestSchema, passwordSchema, signupFormSchema } from "../index";

const validRequest = {
  sizeTier: "tier_10_30" as const,
  unitCount: 25,
  categories: ["computers_laptops"] as const,
  windowStart: "2026-08-05T13:00:00Z",
  windowEnd: "2026-08-05T16:00:00Z",
  onSiteContactName: "Jane Doe",
  onSiteContactPhone: "5550192345",
  dockAddress: "Main Facility Dock A",
  instructions: "",
};

describe("pickupRequestSchema", () => {
  it("accepts a valid request", () => {
    expect(pickupRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("rejects fewer than 10 units", () => {
    const result = pickupRequestSchema.safeParse({ ...validRequest, unitCount: 9 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Minimum 10 devices required for pickup");
    }
  });

  it("accepts exactly 10 units", () => {
    expect(pickupRequestSchema.safeParse({ ...validRequest, unitCount: 10 }).success).toBe(true);
  });

  it("rejects an empty category list", () => {
    expect(pickupRequestSchema.safeParse({ ...validRequest, categories: [] }).success).toBe(false);
  });

  it("rejects a window that ends before it starts", () => {
    const result = pickupRequestSchema.safeParse({
      ...validRequest,
      windowEnd: "2026-08-05T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a phone number that is not 10 digits", () => {
    expect(
      pickupRequestSchema.safeParse({ ...validRequest, onSiteContactPhone: "555019" }).success,
    ).toBe(false);
  });
});

describe("SIZE_TIERS", () => {
  it("exposes exactly the four tiers from the design", () => {
    expect(SIZE_TIERS.map((t) => t.value)).toEqual([
      "tier_10_30",
      "tier_30_100",
      "tier_100_300",
      "tier_300_plus",
    ]);
  });

  it("defaults the first tier to a count of 25", () => {
    expect(SIZE_TIERS[0]?.defaultCount).toBe(25);
  });

  it("gives every tier a label and a subtitle", () => {
    for (const tier of SIZE_TIERS) {
      expect(tier.label.length).toBeGreaterThan(0);
      expect(tier.subtitle.length).toBeGreaterThan(0);
    }
  });
});

describe("passwordSchema", () => {
  it("rejects a password under 10 characters", () => {
    expect(passwordSchema.safeParse("Short1!").success).toBe(false);
  });
  it("rejects a password with no digit", () => {
    expect(passwordSchema.safeParse("NoDigitsHere!").success).toBe(false);
  });
  it("accepts a compliant password", () => {
    expect(passwordSchema.safeParse("RebinTech2026!").success).toBe(true);
  });
});

describe("orgSignupSchema", () => {
  const valid = {
    orgName: "Dhaka Medical College",
    orgType: "hospital" as const,
    contactName: "Dr. Khan",
    contactTitle: "Facilities Director",
    workEmail: "khan@dmc.edu",
    phone: "5550192345",
    street: "100 Main St",
    city: "Boston",
    state: "MA",
    zip: "02108",
    dockAccess: true,
    password: "RebinTech2026!",
    confirmPassword: "RebinTech2026!",
  };

  it("accepts a complete signup", () => {
    expect(orgSignupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = orgSignupSchema.safeParse({ ...valid, confirmPassword: "Different2026!" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("rejects an invalid two-letter state", () => {
    expect(orgSignupSchema.safeParse({ ...valid, state: "Massachusetts" }).success).toBe(false);
  });

  it("rejects a ZIP that is not 5 or 9 digits", () => {
    expect(orgSignupSchema.safeParse({ ...valid, zip: "021" }).success).toBe(false);
  });
});

describe("supplier signup", () => {
  const base = {
    contactName: "Rakib Hasan",
    email: "rakib@example.com",
    phone: "5550100099",
    password: "RebinTech2026!",
    confirmPassword: "RebinTech2026!",
  };

  it("accepts a supplier without an EIN", () => {
    const parsed = signupFormSchema.safeParse({
      ...base,
      role: "supplier",
      entityName: "Rakib Collection",
      street: "88 Kirby St",
      city: "Cleveland",
      state: "OH",
      zip: "44114",
    });
    expect(parsed.success).toBe(true);
  });

  it("still requires a name", () => {
    const parsed = signupFormSchema.safeParse({
      ...base,
      role: "supplier",
      entityName: "",
      street: "88 Kirby St",
      city: "Cleveland",
      state: "OH",
      zip: "44114",
    });
    expect(parsed.success).toBe(false);
  });
});
