import { render, screen } from "@testing-library/react-native";
import Index from "../app/index";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }), Link: ({ children }: never) => children }));

// `render` is awaited for the same reason documented in
// portal-select.test.tsx and task-1-report.md (RTL 14.0.1 made `render()`
// async internally via `act()`).
describe("S01 Splash", () => {
  it("shows the wordmark and headline", async () => {
    await render(<Index />);
    expect(screen.getByText("Recycle Today.")).toBeTruthy();
    expect(screen.getByText("Protect Tomorrow.")).toBeTruthy();
  });

  it("states the four things the platform promises", async () => {
    await render(<Index />);
    expect(screen.getByText("Certified & Secure")).toBeTruthy();
    expect(screen.getByText("Doorstep Pickup")).toBeTruthy();
    expect(screen.getByText("Earn from E-Waste")).toBeTruthy();
    expect(screen.getByText("Reduce Impact")).toBeTruthy();
  });

  it("offers a single way forward", async () => {
    await render(<Index />);
    expect(screen.getByRole("button", { name: "Get Started" })).toBeTruthy();
  });

  it("does not make the visitor pick a portal before they have context", async () => {
    await render(<Index />);
    expect(screen.queryByText("Organizations")).toBeNull();
    expect(screen.queryByText("Field Agents")).toBeNull();
  });
});
