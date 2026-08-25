import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import SignupRegister from "../app/(auth)/signup/register";

const mockOrg = jest.fn();
const mockBusiness = jest.fn();
const mockSignIn = jest.fn();
jest.mock("@rebin/api", () => ({
  signUpOrganization: (...a: unknown[]) => mockOrg(...a),
  signUpBusiness: (...a: unknown[]) => mockBusiness(...a),
  signIn: (...a: unknown[]) => mockSignIn(...a),
}));

// Overridden per-test to simulate arriving from a specific role card.
// Prefixed `mock` so jest.mock's factory is allowed to close over it.
let mockRouteParams: { role?: string } = {};
// A stable reference, not a fresh jest.fn() per useRouter() call: onContinue
// (register.tsx) reads router.replace across a render caused by setDone(true),
// so a test asserting on it needs the same mock instance the component
// actually calls, not a new one minted the next time useRouter() runs.
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
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
/** Fills every field a business must supply. Overrides let a test make
 *  exactly one thing wrong without restating the other fields. */
async function fillBusinessForm(overrides: { confirmPassword?: string } = {}) {
  await fireEvent.changeText(screen.getByLabelText("Full name"), "Dana Reyes");
  await fireEvent.changeText(screen.getByLabelText("Email"), "dana@rebin.test");
  await fireEvent.changeText(screen.getByLabelText("Phone"), "5550192345");
  await fireEvent.changeText(screen.getByLabelText("Business name"), "Reyes Repair");
  await fireEvent.press(screen.getByLabelText("Business type"));
  await fireEvent.press(screen.getByRole("button", { name: "Repair Shop" }));
  await fireEvent.changeText(screen.getByLabelText("Street address"), "12 Main St");
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
    mockRouteParams = { role: "business" };
    await render(<SignupRegister />);
    expect(screen.getByText("Business owner")).toBeTruthy();
  });

  it("falls back to organization for an unknown role param", async () => {
    mockRouteParams = { role: "not-a-role" };
    await render(<SignupRegister />);
    expect(screen.getByText("Organization")).toBeTruthy();
  });

  it("shows organization-only fields and hides business-only ones", async () => {
    mockRouteParams = { role: "organization" };
    await render(<SignupRegister />);
    expect(screen.getByLabelText("Organization type")).toBeTruthy();
    expect(screen.getByLabelText("Street address")).toBeTruthy();
    expect(screen.queryByLabelText("Business type")).toBeNull();
  });

  it("swaps the field set when the role dropdown changes", async () => {
    mockRouteParams = { role: "organization" };
    await render(<SignupRegister />);
    await fireEvent.press(screen.getByLabelText("I'm signing up as"));
    await fireEvent.press(screen.getByRole("button", { name: "Business owner" }));

    // Business has its own type and an optional EIN, and no org type.
    expect(screen.getByLabelText("Business type")).toBeTruthy();
    expect(screen.queryByLabelText("Organization type")).toBeNull();
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
    mockRouteParams = { role: "business" };
    await render(<SignupRegister />);
    await fillBusinessForm({ confirmPassword: "RebinTech2027!" });
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(screen.getByText("Passwords do not match")).toBeTruthy());
    expect(mockBusiness).not.toHaveBeenCalled();
  });

  it("submits a business through the business endpoint, not the organization one", async () => {
    mockRouteParams = { role: "business" };
    mockBusiness.mockResolvedValue({ userId: "u1", businessId: "b1" });
    await render(<SignupRegister />);
    await fillBusinessForm();
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(mockBusiness).toHaveBeenCalledTimes(1));
    expect(mockOrg).not.toHaveBeenCalled();
    expect(mockBusiness).toHaveBeenCalledWith(
      expect.objectContaining({
        contactName: "Dana Reyes",
        businessName: "Reyes Repair",
        businessType: "repair_shop",
      }),
    );
  });

  // RootRedirect (app/_layout.tsx) only ever evaluates resolveInitialRoute
  // while sitting at "/" -- a signed-in user browsing deeper in their portal
  // must never be yanked back to its dashboard by an unrelated render. This
  // screen is "/(auth)/signup/register", not "/", so onContinue has to
  // navigate there itself or RootRedirect never gets a chance to run and the
  // button does nothing after a successful sign-in.
  it("navigates to \"/\" after signing in, so RootRedirect can route to the right portal", async () => {
    mockRouteParams = { role: "business" };
    mockBusiness.mockResolvedValue({ userId: "u1", businessId: "b1" });
    mockSignIn.mockResolvedValue({ userId: "u1" });
    await render(<SignupRegister />);
    await fillBusinessForm();
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Go to my dashboard" })).toBeTruthy());
    await fireEvent.press(screen.getByRole("button", { name: "Go to my dashboard" }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith("dana@rebin.test", "RebinTech2026!"));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("falls back to the login screen if the post-signup sign-in fails", async () => {
    mockRouteParams = { role: "business" };
    mockBusiness.mockResolvedValue({ userId: "u1", businessId: "b1" });
    mockSignIn.mockRejectedValue(new Error("network"));
    await render(<SignupRegister />);
    await fillBusinessForm();
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Go to my dashboard" })).toBeTruthy());
    await fireEvent.press(screen.getByRole("button", { name: "Go to my dashboard" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
    expect(mockReplace).not.toHaveBeenCalledWith("/");
  });
});
