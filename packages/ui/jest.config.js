module.exports = {
  preset: "jest-expo",
  // NOTE: the (?:\.pnpm/[^/]+/node_modules/)? prefix below is a deviation from the
  // brief's literal pattern, required because pnpm nests packages under
  // node_modules/.pnpm/<key>/node_modules/<pkg>/... — the brief's pattern only
  // matches a single flat node_modules/ segment (as in npm/yarn) and was matching
  // the outer node_modules/.pnpm/ segment as "ignored" before ever reaching the
  // real package name, causing @react-native/js-polyfills (an ESM-only transitive
  // dep pulled in by @react-native/jest-preset) to be left untransformed and fail
  // with "Cannot use import statement outside a module". Same fix as apps/mobile
  // (see task-1-report.md).
  transformIgnorePatterns: [
    "node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@rebin/.*|react-navigation|@react-navigation/.*|@shopify/.*|nativewind|react-native-css-interop))",
  ],
  // Task 15: react-native-reanimated and react-native-keyboard-controller
  // both bind to native modules that aren't available under Jest (and, for
  // reanimated v4.5.1 + react-native-worklets 0.11.3, the package's own
  // shipped mock.js/mock.ts is itself broken under Jest — see
  // packages/ui/__mocks__/react-native-reanimated.js for details). Manual
  // mocks in packages/ui/__mocks__/ stand in for both; Jest auto-resolves
  // __mocks__/<pkg>.js for node_modules packages relative to rootDir, no
  // explicit mapping needed.
};
