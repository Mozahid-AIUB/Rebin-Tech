import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types.gen";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether this build was given a backend to talk to.
 *
 * This file used to `throw` when either was missing. Throwing at module scope
 * is the worst place for it: this module is imported before the first screen
 * renders, so the app died on launch with no message -- a blank crash on
 * every device, indistinguishable from a broken binary.
 *
 * It happened for real. `eas.json`'s production profile named no environment,
 * EAS resolves variables per named environment, so an App Store build shipped
 * with neither value while the preview APK -- whose profile does name one --
 * worked perfectly. The misconfiguration was one line; the symptom was an app
 * that could not open.
 *
 * So the failure is now a value the UI can render instead of an exception the
 * runtime cannot survive. A build without configuration still cannot work,
 * but it can say so.
 */
export const isConfigured = Boolean(url && anonKey);

/** What to show when `isConfigured` is false. Names the missing variable. */
export const configurationError = isConfigured
  ? null
  : `This build is missing ${[
      !url && "EXPO_PUBLIC_SUPABASE_URL",
      !anonKey && "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    ]
      .filter(Boolean)
      .join(" and ")}. It was built without a backend to connect to.`;

/**
 * The client.
 *
 * Falls back to a syntactically valid but unreachable URL when unconfigured,
 * so `createClient` returns rather than throwing. Every request then fails as
 * a network error, which the app already handles -- and RootGuard shows
 * `configurationError` before any of them are made.
 */
export const supabase = createClient<Database>(
  url || "https://unconfigured.invalid",
  anonKey || "unconfigured",
  {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  },
);
