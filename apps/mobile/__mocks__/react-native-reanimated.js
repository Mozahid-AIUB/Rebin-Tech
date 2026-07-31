// Manual Jest mock for `react-native-reanimated`.
//
// Mirrors packages/ui/__mocks__/react-native-reanimated.js. Jest resolves
// __mocks__/<pkg>.js relative to each package's own rootDir, so the mock in
// packages/ui does not apply when apps/mobile is the test root — this app
// needs its own copy. Required here because RoleGuard.tsx imports
// `PortalThemeProvider` from `@rebin/ui`'s index, which re-exports
// AuthScreen.tsx, which imports `Animated`/`FadeInDown` from this package.
//
// reanimated v4 is tightly coupled to `react-native-worklets`'s native
// module, which initializes at import time and is unavailable under Jest.
// reanimated ships its own `mock.js`/`mock.ts` for testing, but as installed
// here (v4.5.1 + react-native-worklets 0.11.3) that shipped mock itself
// re-imports the real native initializer path and throws
// ("Cannot read properties of undefined (reading 'loadUnpackersWithCode')")
// — a known rough edge in the v4 New-Architecture rewrite, not a wiring
// mistake in this repo's Jest config.
//
// AuthScreen.tsx only uses `Animated.View` and the `FadeInDown` entrance
// preset (`FadeInDown.duration(n).delay(n)`), purely for a mount-in fade —
// no test asserts on animation timing or values. This mock provides a
// minimal, faithful stand-in: `Animated.View` renders as a plain RN `View`
// (dropping the `entering`/`exiting` props, which have no meaning without
// the native animation driver), and `FadeInDown` is a chainable no-op
// builder matching the same call shape used in AuthScreen.tsx.
const React = require("react");
const { View } = require("react-native");

const AnimatedView = React.forwardRef(function AnimatedView({ entering, exiting, layout, ...props }, ref) {
  return React.createElement(View, { ...props, ref });
});

function makeChainable() {
  const chain = {
    duration: () => chain,
    delay: () => chain,
    springify: () => chain,
    damping: () => chain,
  };
  return chain;
}

module.exports = {
  __esModule: true,
  default: { View: AnimatedView },
  FadeInDown: makeChainable(),
  FadeIn: makeChainable(),
  FadeOut: makeChainable(),
};
