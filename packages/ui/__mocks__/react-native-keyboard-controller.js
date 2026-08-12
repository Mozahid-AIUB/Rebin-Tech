// Manual Jest mock for `react-native-keyboard-controller`.
//
// The real package binds to a native module (KeyboardController) that isn't
// linked/built in the Jest (jsdom/RN test renderer) environment — jest-expo's
// preset does not ship a mock for it the way it does for some other native
// libs. AuthScreen.tsx only consumes `KeyboardAwareScrollView` from this
// package, so this mock provides a plain pass-through implementation backed
// by RN's own ScrollView, dropping the keyboard-avoidance-specific props
// (`bottomOffset`, etc.) that have no meaning without the native controller.
// This file is test-only (Jest resolves `__mocks__/<pkg>.js` automatically
// for node_modules mocks) and never ships in the app bundle.
//
// `KeyboardProvider` added to match apps/mobile's copy of this mock — the
// app's root layout now wraps everything in it (a real runtime crash on web
// was traced to this provider being missing app-wide). Pass-through here
// too: just renders children.
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
