import { useEffect } from "react";
import { resolveRoles, supabase, useSessionStore } from "@rebin/api";

/**
 * Rehydrates the session store from whatever Supabase already has on disk.
 *
 * Without this the store sat at `status: "loading"` until someone submitted
 * the login form -- `setSession` had exactly one caller (useLogin). Supabase
 * persists the session to AsyncStorage and refreshes it on its own, so the
 * tokens survived a restart perfectly well; the app just never asked. The
 * visible symptom was having to log in again on every cold start, and
 * RoleGuard rendering nothing because it never left "loading".
 *
 * Runs once at the root. `onAuthStateChange` fires immediately with the
 * restored session on subscribe and again on every later transition (token
 * refresh, sign-out, sign-in from anywhere), so a single subscription covers
 * both the initial hydrate and everything after -- no separate getSession()
 * call, and no window where the two could disagree.
 */
export function useSessionBootstrap() {
  useEffect(() => {
    // Guards against a slow role lookup resolving after the component is gone
    // (or after a newer auth event has already superseded it) and writing a
    // stale session over a newer one.
    let cancelled = false;
    let latest = 0;

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const ticket = ++latest;
      const userId = session?.user?.id;

      if (!userId) {
        if (!cancelled) useSessionStore.getState().setSignedOut();
        return;
      }

      void resolveRoles(userId)
        .then((assignments) => {
          if (cancelled || ticket !== latest) return;
          useSessionStore.getState().setSession(userId, assignments, assignments.length > 0);
        })
        .catch(() => {
          if (cancelled || ticket !== latest) return;
          // A valid token whose roles can't be read is not a signed-in user in
          // any useful sense -- it's an account with no portal. Treating it as
          // signed-out sends them to login rather than stranding the app on a
          // blank "loading" screen forever.
          useSessionStore.getState().setSignedOut();
        });
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);
}
