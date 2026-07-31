module.exports = {
  preset: "jest-expo",
  // NOTE: the (?:\.pnpm/[^/]+/node_modules/)? prefix below is a deviation from the
  // brief's literal pattern, required because pnpm nests packages under
  // node_modules/.pnpm/<key>/node_modules/<pkg>/... — the brief's pattern only
  // matches a single flat node_modules/ segment (as in npm/yarn) and was matching
  // the outer node_modules/.pnpm/ segment as "ignored" before ever reaching the
  // real package name, causing @react-native/js-polyfills (an ESM-only transitive
  // dep pulled in by @react-native/jest-preset) to be left untransformed and fail
  // with "Cannot use import statement outside a module". See task-1-report.md.
  transformIgnorePatterns: [
    "node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@rebin/.*|react-navigation|@react-navigation/.*|@shopify/.*|nativewind|react-native-css-interop))",
  ],
};
