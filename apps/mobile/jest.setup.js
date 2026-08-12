// Task 9: RoleGuard.tsx imports `portalForRole`/`RoleAssignment` from the
// `@rebin/api` package root (`packages/api/src/index.ts`), which re-exports
// `./client` — and client.ts throws at module-load time if these env vars are
// unset (see packages/api/src/client.ts). No test in this app exercises real
// network calls, so these are dummy values purely to satisfy that guard under
// Jest; the same pattern already exists in packages/api/jest.setup.js.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

// Task 10: `Screen` (packages/ui/src/organisms/Screen.tsx) calls
// `useSafeAreaInsets()` unconditionally. Under Jest there is no real
// SafeAreaProvider host measuring device insets, so without a mock,
// `useSafeAreaInsets()` throws "No safe area value available." the first
// time any screen built on `Screen` renders in a test — this surfaced here
// because `portal-select.test.tsx` (Step 1 of task-10-brief.md, a literal
// test file that must not be modified) renders `<Index />` directly, with no
// `<SafeAreaProvider>` wrapper of its own (matching the brief's literal
// code — it only mocks "expo-router"). `react-native-safe-area-context`
// ships an official Jest mock for exactly this (its own docs recommend
// `jest.mock("react-native-safe-area-context", () => require(".../jest/mock"))`);
// wiring it once here, globally, means every current and future screen test
// gets safe default insets without each test file needing its own
// SafeAreaProvider boilerplate or its own mock wiring.
// NOTE: the package's own docs show
// `jest.mock("react-native-safe-area-context", () => require(".../jest/mock"))`
// with no `.default` unwrap, but under this repo's Babel/Jest transform
// config, requiring that (TSX, `export default {...}`-only) module from a
// plain .js setup file yields `{ default: {...} }` with no named exports
// hoisted to the top level — so `useSafeAreaInsets` etc. come back
// `undefined` without unwrapping `.default` here.
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);

