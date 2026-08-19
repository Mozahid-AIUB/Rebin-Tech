import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Login from "../app/(auth)/login";

const mockSignIn = jest.fn();
const mockResolveRoles = jest.fn();
const mockReplace = jest.fn();

jest.mock("@rebin/api", () => ({
  signIn: (...a: unknown[]) => mockSignIn(...a),
  resolveRoles: (...a: unknown[]) => mockResolveRoles(...a),
  portalForRole: (r: string) => (r.startsWith("org_") ? "org" : r.startsWith("biz_") ? "business" : null),
  // useLogin.ts imports useSessionStore from "../store/session", which
  // re-exports it FROM @rebin/api (Task 8's approved store location — see
  // apps/mobile/src/store/session.ts). Mocking the whole @rebin/api module
  // above wipes that export out too unless this factory also provides it, so
  // this is a completion of the mock (matching what useLogin.ts actually
  // calls: `useSessionStore((s) => s.setSession)`), not a weakened assertion
  // — no test in this file asserts anything about session store state.
  useSessionStore: (selector: (s: { setSession: (...args: unknown[]) => void }) => unknown) =>
    selector({ setSession: jest.fn() }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));

beforeEach(() => jest.clearAllMocks());

// NOTE: deviation from the brief's literal test body — this repo resolves
// @testing-library/react-native@14.0.1, which made both `render()` and
// `fireEvent.*` async internally (wrapping in `await act(...)` instead of
// calling synchronously). This exact deviation is already documented and
// applied in packages/ui/src/__tests__/auth-primitives.test.tsx (and
// primitives.test.tsx, theme.test.tsx, forms.test.tsx, apps/mobile/__tests__/
// boot.test.tsx / portal-select.test.tsx — see task-1-report.md): every
// `render(...)` call below is awaited (and the first `it` callback gains
// `async` to allow it, since the brief's literal version was synchronous),
// and every `fireEvent.changeText(...)`/`fireEvent.press(...)` call is also
// awaited so the resulting state update (email/password text, submit
// handler) commits before the next line reads it. Without this, `screen`
// stays unpopulated after `render()` ("`render` function has not been
// called"), and an un-awaited `fireEvent.changeText` leaves `onSubmit`
// reading stale (empty) state when the very next `fireEvent.press` fires.
// No change to what is being verified — same fields filled, same button
// pressed, same assertions.
describe("S04 Login", () => {
  it("shows no role or portal selector", async () => {
    await render(<Login />);
    expect(screen.queryByText(/Organizations/)).toBeNull();
    expect(screen.queryByText(/select.*role/i)).toBeNull();
  });

  it("blocks submission on an invalid email", async () => {
    await render(<Login />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "not-an-email");
    await fireEvent.changeText(screen.getByLabelText("Password"), "RebinTech2026!");
    await fireEvent.press(screen.getByRole("button", { name: "Log In" }));
    await waitFor(() => expect(screen.getByText("Enter a valid email address")).toBeTruthy());
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  // field_agent maps to no portal now -- agents work from the operations
  // console, not this app -- so an agent-only account lands on /pending
  // rather than a screen the app no longer has.
  it("routes an agent-only account to pending after a successful login", async () => {
    mockSignIn.mockResolvedValue({ userId: "u1" });
    mockResolveRoles.mockResolvedValue([{ role: "field_agent", scopeType: "self", scopeId: null, scopeName: null }]);
    await render(<Login />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "karim@rebin.test");
    await fireEvent.changeText(screen.getByLabelText("Password"), "RebinTech2026!");
    await fireEvent.press(screen.getByRole("button", { name: "Log In" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/pending"));
  });

  it("surfaces a server error without clearing the email", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid login credentials"));
    await render(<Login />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "someone@rebin.test");
    await fireEvent.changeText(screen.getByLabelText("Password"), "WrongPass2026!");
    await fireEvent.press(screen.getByRole("button", { name: "Log In" }));
    await waitFor(() => expect(screen.getByText("Invalid login credentials")).toBeTruthy());
    expect(screen.getByDisplayValue("someone@rebin.test")).toBeTruthy();
  });
});
