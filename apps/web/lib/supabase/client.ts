"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * The browser client, for components that sign in or mutate.
 *
 * Deliberately not `@rebin/api`'s client: that one stores its session in
 * AsyncStorage and reads `EXPO_PUBLIC_*`, neither of which exists here. This
 * one keeps the session in cookies, which is what lets the server components
 * in `app/admin` read it and refuse a non-staff visitor before rendering.
 *
 * The anon key is public by design -- it identifies the project, it does not
 * authorise anything. Every write in this app goes through a security definer
 * RPC that checks `is_platform_staff()` first, so the key alone buys nothing.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
