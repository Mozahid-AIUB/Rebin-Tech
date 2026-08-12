// Manual Jest mock for `react-native-keyboard-controller`.
//
// Mirrors packages/ui/__mocks__/react-native-keyboard-controller.js. Jest
// resolves __mocks__/<pkg>.js relative to each package's own rootDir, so the
// mock in packages/ui does not apply when apps/mobile is the test root — this
// app needs its own copy. Required here because RoleGuard.tsx imports
// `PortalThemeProvider` from `@rebin/ui`'s index, which re-exports
// AuthScreen.tsx, which imports `KeyboardAwareScrollView` from this package.
// The real package binds to a native module that isn't linked/built in the
// Jest (jsdom/RN test renderer) environment. This mock provides a plain
// pass-through implementation backed by RN's own ScrollView, dropping the
// keyboard-avoidance-specific props (`bottomOffset`, etc.) that have no
// meaning without the native controller. Test-only; never ships in the app
// bundle.
//
// `KeyboardProvider` added because the root layout (apps/mobile/app/
// _layout.tsx) wraps the whole app in it (the real package requires every
// consumer of KeyboardAwareScrollView/etc. to have a KeyboardProvider
// ancestor — the app was missing this and it caused a real runtime crash on
// web, discovered via live browser testing, not by any test). No test
// currently renders `_layout.tsx` directly, but this keeps the mock
// complete for when one does. Pass-through: just renders children.
const React = require("react");
const { ScrollView } = require("react-native");

const KeyboardAwareScrollView = React.forwardRef(function KeyboardAwareScrollView(
  { bottomOffset, ...props },
  ref,
) {
  return React.createElement(ScrollView, { ...props, ref });
});

function KeyboardProvider({ children }) {
  return children ?? null;
}

// Screen drives its floating footer up with the keyboard. Under Jest there is
// no keyboard, so the shared values stay at rest and the footer sits where it
// would with the keyboard closed -- which is the state every test asserts on.
function useReanimatedKeyboardAnimation() {
  return { height: { value: 0 }, progress: { value: 0 } };
}

module.exports = {
  KeyboardAwareScrollView,
  KeyboardProvider,
  useReanimatedKeyboardAnimation,
};
