import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import SignupRegister from "../app/(auth)/signup/register";

const mockOrg = jest.fn();
const mockBusiness = jest.fn();
const mockAgent = jest.fn();
jest.mock("@rebin/api", () => ({
  signUpOrganization: (...a: unknown[]) => mockOrg(...a),
  signUpBusiness: (...a: unknown[]) => mockBusiness(...a),
  signUpAgent: (...a: unknown[]) => mockAgent(...a),
}));

// Overridden per-test to simulate arriving from a specific role card.
// Prefixed `mock` so jest.mock's factory is allowed to close over it.
let mockRouteParams: { role?: string } = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockRouteParams,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
});

// Replaces org-signup.test.tsx: the three-step organization wizard and the
// per-role signup screens were collapsed into one form with a role dropdown,
// so the behavior worth pinning changed shape too. Every `render`/`fireEvent`
// is awaited for the same reason documented across this repo's other suites
// (RNTL 14 made both async internally).
/** Fills every field an agent must supply. Overrides let a test make exactly
 *  one thing wrong without restating the other nine fields. */
async function fillAgentForm(overrides: { confirmPassword?: string } = {}) {
  await fireEvent.changeText(screen.getByLabelText("Full name"), "Dana Reyes");
  await fireEvent.changeText(screen.getByLabelText("Email"), "dana@rebin.test");
  await fireEvent.changeText(screen.getByLabelText("Phone"), "5550192345");
  await fireEvent.press(screen.getByLabelText("Vehicle"));
  await fireEvent.press(screen.getByRole("button", { name: "Van" }));
  await fireEvent.changeText(screen.getByLabelText("City"), "Newark");
  await fireEvent.press(screen.getByLabelText("State"));
  await fireEvent.press(screen.getByRole("button", { name: "New Jersey" }));
  await fireEvent.changeText(screen.getByLabelText("ZIP code"), "07102");
  await fireEvent.changeText(screen.getByLabelText("Create password"), "RebinTech2026!");
  await fireEvent.changeText(
    screen.getByLabelText("Confirm password"),
    overrides.confirmPassword ?? "RebinTech2026!",
  );
}

describe("Signup registration form", () => {
  it("preselects the role passed by the role picker", async () => {
    mockRouteParams = { role: "agent" };
    await render(<SignupRegister />);
    expect(screen.getByText("Field agent")).toBeTruthy();
  });

  it("falls back to organization for an unknown role param", async () => {
    mockRouteParams = { role: "not-a-role" };
    await render(<SignupRegister />);
    expect(screen.getByText("Organization")).toBeTruthy();
  });

  it("shows organization-only fields and hides agent-only ones", async () => {
    mockRouteParams = { role: "organization" };
    await render(<SignupRegister />);
    expect(screen.getByLabelText("Organization type")).toBeTruthy();
    expect(screen.getByLabelText("Street address")).toBeTruthy();
    expect(screen.queryByLabelText("Vehicle")).toBeNull();
  });

  it("swaps the field set when the role dropdown changes", async () => {
    mockRouteParams = { role: "organization" };
    await render(<SignupRegister />);
    await fireEvent.press(screen.getByLabelText("I'm signing up as"));
    await fireEvent.press(screen.getByRole("button", { name: "Field agent" }));

    // Agent has no entity and no street -- routing needs a service area.
    expect(screen.getByLabelText("Vehicle")).toBeTruthy();
    expect(screen.queryByLabelText("Organization type")).toBeNull();
    expect(screen.queryByLabelText("Street address")).toBeNull();
  });

  it("reports role-specific validation errors on submit", async () => {
    mockRouteParams = { role: "business" };
    await render(<SignupRegister />);
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(screen.getByText("Business name is required")).toBeTruthy());
    expect(mockBusiness).not.toHaveBeenCalled();
  });

  // The password-match rule lives on the union, not on a single field, so it
  // is only reached once every other field parses -- filling the form out is
  // part of what's being verified here, not test noise.
  it("rejects mismatched passwords on an otherwise valid form", async () => {
    mockRouteParams = { role: "agent" };
    await render(<SignupRegister />);
    await fillAgentForm({ confirmPassword: "RebinTech2027!" });
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(screen.getByText("Passwords do not match")).toBeTruthy());
    expect(mockAgent).not.toHaveBeenCalled();
  });

  it("submits an agent through the agent endpoint, not the organization one", async () => {
    mockRouteParams = { role: "agent" };
    mockAgent.mockResolvedValue({ userId: "u1" });
    await render(<SignupRegister />);
    await fillAgentForm();
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(mockAgent).toHaveBeenCalledTimes(1));
    expect(mockOrg).not.toHaveBeenCalled();
    // Common form fields arrive under the agent endpoint's own names.
    expect(mockAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Dana Reyes",
        serviceCity: "Newark",
        serviceState: "NJ",
        serviceZip: "07102",
        vehicle: "van",
      }),
    );
  });
});
