import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import OrgSignup from "../app/(auth)/signup/organization";

const mockSignUp = jest.fn();
jest.mock("@rebin/api", () => ({ signUpOrganization: (...a: unknown[]) => mockSignUp(...a) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }) }));

beforeEach(() => jest.clearAllMocks());

// NOTE: deviation from the brief's literal test body — this repo resolves
// @testing-library/react-native@14.0.1, which made both `render()` and
// `fireEvent.*` async internally (wrapping in `await act(...)` instead of
// calling synchronously). This exact deviation is already documented and
// applied throughout the repo (packages/ui/src/__tests__/*.test.tsx,
// apps/mobile/__tests__/login.test.tsx, portal-select.test.tsx — see
// task-1-report.md and task-11-report.md): every `render(...)` call below is
// awaited (and every `it` callback is `async` to allow it), and every
// `fireEvent.changeText(...)`/`fireEvent.press(...)` call is also awaited so
// the resulting state update commits before the next line reads it. Without
// this, `screen` stays unpopulated after `render()` ("`render` function has
// not been called"), and an un-awaited `fireEvent.changeText` leaves state
// reads stale when the very next `fireEvent.press` fires. No change to what
// is being verified — same fields filled, same buttons pressed, same
// assertions, same copy strings.
describe("S10–S13 Organization signup", () => {
  it("starts on step 1 of 3", async () => {
    await render(<OrgSignup />);
    expect(screen.getByLabelText("Step 1 of 3: Organization")).toBeTruthy();
  });

  it("blocks advancing past step 1 with an empty organization name", async () => {
    await render(<OrgSignup />);
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.getByText("Organization name is required")).toBeTruthy());
    expect(screen.getByLabelText("Step 1 of 3: Organization")).toBeTruthy();
  });

  it("advances to step 2 once step 1 is valid", async () => {
    await render(<OrgSignup />);
    await fireEvent.changeText(screen.getByLabelText("Organization Name"), "Dhaka Medical College");
    await fireEvent.press(screen.getByLabelText("Organization Type"));
    await fireEvent.press(screen.getByRole("button", { name: "Hospital / Clinic" }));
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.getByLabelText("Step 2 of 3: Contact")).toBeTruthy());
  });

  it("renders the dock-access toggle with the client's exact helper copy on step 3", async () => {
    await render(<OrgSignup />);
    // step 1
    await fireEvent.changeText(screen.getByLabelText("Organization Name"), "Dhaka Medical College");
    await fireEvent.press(screen.getByLabelText("Organization Type"));
    await fireEvent.press(screen.getByRole("button", { name: "Hospital / Clinic" }));
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    // step 2
    await waitFor(() => screen.getByLabelText("Primary Contact Name"));
    await fireEvent.changeText(screen.getByLabelText("Primary Contact Name"), "Dr. Khan");
    await fireEvent.changeText(screen.getByLabelText("Contact Title"), "Facilities Director");
    await fireEvent.changeText(screen.getByLabelText("Work Email"), "khan@dmc.edu");
    await fireEvent.changeText(screen.getByLabelText("Phone Number"), "5550192345");
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    // step 3
    await waitFor(() =>
      expect(screen.getByText("Select Yes if freight trucks can back into the dock")).toBeTruthy(),
    );
  });
});
