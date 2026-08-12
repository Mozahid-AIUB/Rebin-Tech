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
// AuthScreen.tsx uses `Animated.View` and the `FadeInDown` entrance preset
// (`FadeInDown.duration(n).delay(n)`), purely for a mount-in fade. EWasteHero
// (packages/ui/src/illustrations/EWasteHero.tsx) additionally uses
// `Animated.createAnimatedComponent`, `useSharedValue`, `useAnimatedProps`,
// `withRepeat`/`withSequence`/`withTiming`, and `Easing` to gently animate an
// SVG path — again purely decorative motion with no test asserting on
// timing/values. This mock provides minimal, faithful stand-ins for both
// call shapes: `Animated.View` and `createAnimatedComponent(X)` both render
// their wrapped component as a plain pass-through (dropping animation-only
// props with no meaning without the native driver), the animation hooks
// return inert values/no-ops, and `FadeInDown`/etc. are chainable no-op
// builders matching the real API's call shape.
const React = require("react");
const { View } = require("react-native");

const AnimatedView = React.forwardRef(function AnimatedView({ entering, exiting, layout, ...props }, ref) {
  return React.createElement(View, { ...props, ref });
});

function createAnimatedComponent(Component) {
  return React.forwardRef(function AnimatedComponent(
    { entering, exiting, layout, animatedProps, animatedStyle, ...props },
    ref,
  ) {
    return React.createElement(Component, { ...props, ref });
  });
}

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
  default: { View: AnimatedView, createAnimatedComponent },
  createAnimatedComponent,
  FadeInDown: makeChainable(),
  FadeIn: makeChainable(),
  FadeOut: makeChainable(),
  useSharedValue: (initial) => ({ value: initial }),
  useAnimatedProps: (factory) => factory(),
  useAnimatedStyle: (factory) => factory(),
  withTiming: (toValue) => toValue,
  withRepeat: (animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  // Added with the motion layer (packages/ui/src/motion.tsx). Under Jest there
  // is no accessibility service to ask, and "motion is on" is the branch the
  // components' real behaviour lives in.
  withSpring: (toValue) => toValue,
  withDelay: (_delay, animation) => animation,
  useReducedMotion: () => false,
  Easing: {
    inOut: (fn) => fn,
    sin: (t) => t,
    linear: (t) => t,
  },
};
