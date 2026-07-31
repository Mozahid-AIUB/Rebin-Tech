import { render, screen } from "@testing-library/react-native";
import PortalSelect from "../app/(public)/portal-select";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }), Link: ({ children }: never) => children }));

// NOTE: two deviations from the brief's literal test body.
//
// 1. Every `render(...)` call is awaited. Same root cause documented in
//    task-1-report.md: @testing-library/react-native@14.0.1 made `render()`
//    async internally via `act()`, so `screen` is only populated once the
//    returned promise resolves.
//
// 2. The screen under test moved from `app/index.tsx` to
//    `app/(public)/portal-select.tsx`. `app/index.tsx` became the splash
//    screen (hero + value props + "Get Started"), and portal selection —
//    the same content these assertions cover — now lives behind that CTA on
//    its own route. The assertions themselves are unchanged; only the
//    import path moved with the screen.
describe("S02 Portal Select", () => {
  it("shows all three portal cards", async () => {
    await render(<PortalSelect />);
    expect(screen.getByText("Organizations")).toBeTruthy();
    expect(screen.getByText("Businesses")).toBeTruthy();
    expect(screen.getByText("Field Agents")).toBeTruthy();
  });

  it("labels the organization portal as zero-cost", async () => {
    await render(<PortalSelect />);
    expect(screen.getByText("Zero-Cost Bulk Removal")).toBeTruthy();
    expect(screen.getByText("10+ DEVICE MINIMUM")).toBeTruthy();
  });

  it("labels the business portal as paid", async () => {
    await render(<PortalSelect />);
    expect(screen.getByText("Get Paid for Scrap")).toBeTruthy();
  });

  it("marks the agent portal as invite only", async () => {
    await render(<PortalSelect />);
    expect(screen.getByText("INVITE ONLY")).toBeTruthy();
  });

  it("offers a public price catalog link and a login shortcut", async () => {
    await render(<PortalSelect />);
    expect(screen.getByRole("button", { name: "Browse Price Catalog" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log In" })).toBeTruthy();
  });
});
