import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * The server client, carrying the caller's own session.
 *
 * There is no service-role client in this application, and there should not
 * be one. That key bypasses RLS entirely, and nothing here needs it: the
 * admin RPCs already run `security definer` behind an `is_platform_staff()`
 * check, so an operator's own session has exactly the authority required.
 * A service-role key in a Next.js app is one stray import away from turning
 * any route into a full-database read.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where the response headers are
            // already sent. The middleware refreshes the session on every
            // request, so the write that matters happens there instead.
          }
        },
      },
    },
  );
}

/** The two roles `is_platform_staff()` accepts. Read the SQL, not this list. */
const STAFF_ROLES = ["platform_owner", "platform_ops"] as const;

/**
 * The signed-in operator, or null.
 *
 * Asks the database who the caller is rather than trusting a cookie: RLS on
 * `role_assignments` only ever returns the caller's own rows, so a forged
 * cookie yields nothing. This gate decides what to render; it is not what
 * stops a non-admin writing -- the RPCs do that, on their own.
 */
export async function getStaffUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roles } = await supabase
    .from("role_assignments")
    .select("role")
    .eq("user_id", user.id)
    .is("revoked_at", null);

  const staffRole = roles?.find((r) =>
    (STAFF_ROLES as readonly string[]).includes(r.role),
  );
  if (!staffRole) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name ?? user.email ?? "Operator",
    role: staffRole.role,
  };
}
