module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  // @react-native-async-storage/async-storage's real native module isn't
  // present under Jest (see the error this produces without the mapping:
  // "[@RNC/AsyncStorage]: NativeModule: AsyncStorage is null."). This surfaced
  // in Task 9 because RoleGuard.tsx imports from `@rebin/api`'s package root,
  // which transitively loads packages/api/src/client.ts (the Supabase client),
  // which imports AsyncStorage for session storage. The package ships an
  // official Jest mock for exactly this; see
  // https://react-native-async-storage.github.io/async-storage/docs/advanced/jest
  // — same fix already applied in packages/api/jest.config.js.
  moduleNameMapper: {
    "^@react-native-async-storage/async-storage$":
      "@react-native-async-storage/async-storage/jest/async-storage-mock",
  },
  // NOTE: the (?:\.pnpm/[^/]+/node_modules/)? prefix below is a deviation from the
  // brief's literal pattern, required because pnpm nests packages under
  // node_modules/.pnpm/<key>/node_modules/<pkg>/... — the brief's pattern only
  // matches a single flat node_modules/ segment (as in npm/yarn) and was matching
  // the outer node_modules/.pnpm/ segment as "ignored" before ever reaching the
  // real package name, causing @react-native/js-polyfills (an ESM-only transitive
  // dep pulled in by @react-native/jest-preset) to be left untransformed and fail
  // with "Cannot use import statement outside a module". See task-1-report.md.
  //
  // "standard-navigation" was added in Task 9: it's a direct dependency of
  // expo-router (imported from expo-router's own entry point) that ships
  // ESM-only source, the same category of problem as the react-native/expo
  // packages above. Without whitelisting it, any file that imports from
  // "expo-router" (e.g. RoleGuard.tsx's `import { Redirect } from "expo-router"`)
  // fails with "Cannot use import statement outside a module" the first time a
  // test pulls that import in. See task-9-report.md.
  transformIgnorePatterns: [
    "node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@rebin/.*|react-navigation|@react-navigation/.*|@shopify/.*|nativewind|react-native-css-interop|standard-navigation))",
  ],
  // react-native-reanimated and react-native-keyboard-controller both bind to
  // native modules that aren't available under Jest. RoleGuard.tsx imports
  // `PortalThemeProvider` from `@rebin/ui`, whose index re-exports
  // AuthScreen.tsx, which imports both. Manual mocks in apps/mobile/__mocks__/
  // stand in for both (mirroring packages/ui/__mocks__/, which Jest does not
  // apply here since __mocks__ resolution is rootDir-relative); Jest
  // auto-resolves __mocks__/<pkg>.js for node_modules packages, no explicit
  // mapping needed. See task-9-report.md.
};
