// client.ts throws at module-load time if these are unset, and auth.ts imports
// `supabase` from client.ts at module scope — so even the pure `portalForRole`
// test transitively loads client.ts. These are dummy values purely to satisfy
// that guard under Jest; no test in this package exercises real network calls,
// so the local Supabase stack does not need to be reachable for `pnpm test`.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
