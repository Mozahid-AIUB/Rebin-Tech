import { useState } from "react";
import { useRouter, type Href } from "expo-router";
import { signOut, useSessionStore } from "@rebin/api";

// See RoleGuard.tsx's own `asHref` for the identical reasoning: a known,
// hand-authored route name, never unvalidated user input.
function asHref(path: string): Href {
  return path as Href;
}

/**
 * The one way out of a signed-in session.
 *
 * `signOut()` existed in @rebin/api from the start but had no caller anywhere
 * in the app -- there was no way for a user to leave an account. Centralised
 * here because every exit has to do the same three things in the same order,
 * and a screen that forgets one leaves the app in a contradictory state.
 */
export function useLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      await signOut();
    } catch {
      // Deliberately ignored. A failed server-side sign-out (offline, expired
      // token) must not trap the user in an account they asked to leave --
      // clearing local state and redirecting is the behavior they requested.
      // Supabase has already dropped the local session in every case where
      // this throws.
    } finally {
      // Not in the try: local state must be cleared even when the network call
      // failed, or the UI would keep rendering a session the user has left.
      useSessionStore.getState().setSignedOut();
      router.replace(asHref("/login"));
      setPending(false);
    }
  }

  return { logout, pending };
}
