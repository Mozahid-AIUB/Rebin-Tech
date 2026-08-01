import { fireEvent, render, screen } from "@testing-library/react-native";
import { AuthButton, AuthInput, SocialButton, authTokens } from "../index";

// NOTE: deviation from the brief's literal test bodies — every `render(...)` call
// below is awaited and its enclosing `it` callback is `async`. This is the same
// @testing-library/react-native@14.0.1 deviation documented in
// packages/ui/src/__tests__/primitives.test.tsx, theme.test.tsx, and
// forms.test.tsx (and apps/mobile/__tests__/boot.test.tsx, see task-1-report.md):
// `render()` became async internally via `act()`, so the `screen` singleton is
// only populated once the returned promise resolves. Without awaiting,
// `screen.getByLabelText`/`getByPlaceholderText`/`getByRole` hit the un-populated
// placeholder and throw "`render` function has not been called". No other change
// from the brief's literal test intent.
//
// A second, related deviation applies to the one `fireEvent.press(...)` call in
// the "toggles the accessibility label when visibility flips" case below: the
// same RTL 14.0.1 version bump also made `fireEvent.press` (and `fireEvent` in
// general — see dist/fire-event.js) async, wrapping the handler invocation in
// `await act(...)` instead of calling it synchronously. Without awaiting it, the
// `AuthInput` component's `setRevealed` state update (and the resulting
// "Show password" -> "Hide password" label flip) had not yet committed by the
// time the very next line queried for "Hide password", so the assertion failed
// with "Unable to find an element with role: button, name: Hide password" even
// though the toggle logic itself is correct. Awaiting it lets the state update
// flush before the following `getByRole` assertion runs. No change to what is
// being verified — press the toggle, then check the label flipped.

describe("AuthInput", () => {
  it("uses the placeholder as the visible affordance and the label for a11y", async () => {
    await render(<AuthInput label="Email" placeholder="Email" value="" onChangeText={jest.fn()} />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByPlaceholderText("Email")).toBeTruthy();
  });

  it("fills with the dark auth surface token", async () => {
    await render(<AuthInput label="Email" placeholder="Email" value="" onChangeText={jest.fn()} />);
    expect(screen.getByLabelText("Email")).toHaveStyle({ backgroundColor: authTokens.surface });
  });

  it("exposes a visibility toggle for secure fields", async () => {
    await render(<AuthInput label="Password" placeholder="Password" value="" onChangeText={jest.fn()} secure />);
    expect(screen.getByRole("button", { name: "Show password" })).toBeTruthy();
  });

  it("toggles the accessibility label when visibility flips", async () => {
    await render(<AuthInput label="Password" placeholder="Password" value="" onChangeText={jest.fn()} secure />);
    await fireEvent.press(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByRole("button", { name: "Hide password" })).toBeTruthy();
  });
});

describe("AuthButton", () => {
  it("renders on the sage primary with a 56pt target", async () => {
    await render(<AuthButton label="Sign in" onPress={jest.fn()} />);
    const btn = screen.getByRole("button", { name: "Sign in" });
    expect(btn).toHaveStyle({ backgroundColor: authTokens.primary, minHeight: 56 });
  });

  it("ignores presses while loading", async () => {
    const onPress = jest.fn();
    await render(<AuthButton label="Sign in" onPress={onPress} loading />);
    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("SocialButton", () => {
  it.each([
    ["google", "Continue with Google"],
    ["apple", "Continue with Apple"],
  ] as const)("labels the %s provider", async (provider, label) => {
    await render(<SocialButton provider={provider} onPress={jest.fn()} />);
    expect(screen.getByRole("button", { name: label })).toBeTruthy();
  });

  // NOTE: design change, human-directed -- second reversal of this one
  // assertion, so the history matters. The plan doc originally specified an
  // outlined social button; a user-supplied reference image then moved it to
  // solid white; a later design review reverted it to outlined because two
  // white full-bleed blocks out-weighed the primary "Log In" CTA on the dark
  // auth background. The current rule this test guards: social buttons are
  // SECONDARY, so they sit on the auth surface with a border, never on a
  // higher-contrast fill than the CTA above them.
  it("renders outlined on the auth surface, not filled white", async () => {
    await render(<SocialButton provider="google" onPress={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Continue with Google" })).toHaveStyle({
      backgroundColor: authTokens.surface,
      borderWidth: 1,
      borderColor: authTokens.border,
    });
  });
});
