import { render, screen } from "@testing-library/react-native";
import Index from "../app/index";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }), Link: ({ children }: never) => children }));

// NOTE: deviation from the brief's literal test body — every `render(...)`
// call below is awaited, where the brief's literal code calls `render`
// without `await`. Same root cause already documented in boot.test.tsx (see
// task-1-report.md): @testing-library/react-native@14.0.1 (the version this
// repo resolves) made `render()` async internally via `act()`, so `screen`
// is only populated once the returned promise resolves — `screen.getByText`/
// `getByRole` throw "`render` function has not been called" otherwise,
// regardless of what the component under test renders. Awaiting preserves
// the test's intent (assert the rendered screen shows the expected content)
// while matching the real, current API.
describe("S02 Portal Select", () => {
  it("shows all three portal cards", async () => {
    await render(<Index />);
    expect(screen.getByText("Organizations")).toBeTruthy();
    expect(screen.getByText("Businesses")).toBeTruthy();
    expect(screen.getByText("Field Agents")).toBeTruthy();
  });

  it("labels the organization portal as zero-cost", async () => {
    await render(<Index />);
    expect(screen.getByText("Zero-Cost Bulk Removal")).toBeTruthy();
    expect(screen.getByText("10+ DEVICE MINIMUM")).toBeTruthy();
  });

  it("labels the business portal as paid", async () => {
    await render(<Index />);
    expect(screen.getByText("Get Paid for Scrap")).toBeTruthy();
  });

  it("marks the agent portal as invite only", async () => {
    await render(<Index />);
    expect(screen.getByText("INVITE ONLY")).toBeTruthy();
  });

  it("offers a public price catalog link and a login shortcut", async () => {
    await render(<Index />);
    expect(screen.getByRole("button", { name: "Browse Price Catalog" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log In" })).toBeTruthy();
  });
});
