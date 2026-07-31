// Task 9: RoleGuard.tsx imports `portalForRole`/`RoleAssignment` from the
// `@rebin/api` package root (`packages/api/src/index.ts`), which re-exports
// `./client` — and client.ts throws at module-load time if these env vars are
// unset (see packages/api/src/client.ts). No test in this app exercises real
// network calls, so these are dummy values purely to satisfy that guard under
// Jest; the same pattern already exists in packages/api/jest.setup.js.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
