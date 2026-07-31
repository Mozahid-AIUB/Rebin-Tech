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
const React = require("react");
const { ScrollView } = require("react-native");

const KeyboardAwareScrollView = React.forwardRef(function KeyboardAwareScrollView(
  { bottomOffset, ...props },
  ref,
) {
  return React.createElement(ScrollView, { ...props, ref });
});

module.exports = {
  KeyboardAwareScrollView,
};
