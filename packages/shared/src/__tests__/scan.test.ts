import { scanDisposition, scanResultSchema } from "../schemas/scan";

// The plan's confidence gates (§6): >=90 auto-accept, 70-89 accept with a
// review prompt, <70 force manual entry. Encoded once here so the camera
// screen and the agent scanner can't drift apart on where the lines are.
describe("scanDisposition", () => {
  it.each([
    [100, "auto"],
    [90, "auto"],
    [89, "review"],
    [70, "review"],
    [69, "manual"],
    [0, "manual"],
  ] as const)("maps confidence %i to %s", (confidence, expected) => {
    expect(scanDisposition(confidence)).toBe(expected);
  });
});

describe("scanResultSchema", () => {
  const item = {
    deviceCategory: "computers_laptops",
    make: "Dell",
    model: "OptiPlex 7090",
    serial: "ABC123",
    confidence: 94,
  };

  it("accepts a fully identified device", () => {
    expect(scanResultSchema.safeParse({ items: [item] }).success).toBe(true);
  });

  // A photo of a monitor from across a room gives a category and nothing else.
  // Refusing that would push a real, common case into manual entry.
  it("accepts a device the model could only categorise", () => {
    const result = scanResultSchema.safeParse({
      items: [{ deviceCategory: "monitors_displays", make: null, model: null, serial: null, confidence: 72 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a category outside the ones a pickup can contain", () => {
    expect(scanResultSchema.safeParse({ items: [{ ...item, deviceCategory: "toaster" }] }).success).toBe(
      false,
    );
  });

  it("rejects a confidence outside 0-100", () => {
    expect(scanResultSchema.safeParse({ items: [{ ...item, confidence: 140 }] }).success).toBe(false);
  });

  // Gemini is constrained by responseSchema, but the Edge Function is a network
  // boundary: whatever arrives is parsed, never trusted.
  it("rejects a response with no items array at all", () => {
    expect(scanResultSchema.safeParse({}).success).toBe(false);
  });
});
