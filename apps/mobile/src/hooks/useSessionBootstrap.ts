import { useEffect } from "react";
import { AppState } from "react-native";
import type { SessionIdentity } from "@rebin/api";
import {
  RolesUnreachableError,
  identityFromAuthUser,
  resolveRoles,
  supabase,
  useSessionStore,
} from "@rebin/api";

/** Backoff between role-lookup retries, in ms. Four tries over ~7 seconds. */
const RETRY_DELAYS = [500, 1500, 5000];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Retries a role lookup that failed because the network was unreachable.
 *
 * Backs off rather than hammering: a phone that just came out of a lift needs
 * a moment, not four immediate requests. `isStale` is checked before every
 * attempt and again before writing, so a newer auth event (a sign-out, a
 * different user signing in) abandons this chain instead of racing it.
 *
 * If every attempt fails the store is left exactly as it was. The session is
 * still on disk and still valid; the next foreground, or the next auth event,
 * will try again. Signing out here would be the very bug this exists to fix.
 */
async function retryRoles(
  userId: string,
  _ticket: number,
  isStale: () => boolean,
  identity: SessionIdentity,
): Promise<void> {
  for (const delay of RETRY_DELAYS) {
    await wait(delay);
    if (isStale()) return;

    try {
      const assignments = await resolveRoles(userId);
      if (isStale()) return;
      useSessionStore
        .getState()
        .setSession(userId, assignments, assignments.length > 0, identity);
      return;
    } catch (e) {
      if (isStale()) return;
      // Still unreachable -- keep backing off. Anything else is a real answer
      // from the server: the account has no roles, so it has no portal.
      if (!(e instanceof RolesUnreachableError)) {
        useSessionStore.getState().setSignedOut();
        return;
      }
    }
  }
}

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
      const user = session?.user;
      const userId = user?.id;

      if (!userId) {
        if (!cancelled) useSessionStore.getState().setSignedOut();
        return;
      }

      // Taken from the session rather than fetched. The email and the social
      // profile picture are already on this object; asking the server for them
      // again is a round trip for something in hand.
      const identity = identityFromAuthUser(user);

      void resolveRoles(userId)
        .then((assignments) => {
          if (cancelled || ticket !== latest) return;
          useSessionStore
            .getState()
            .setSession(userId, assignments, assignments.length > 0, identity);
        })
        .catch((e: unknown) => {
          if (cancelled || ticket !== latest) return;

          // A phone that lost signal still holds a valid session, and throwing
          // it away means logging in again over a dropped bar of reception --
          // which is what a vendor standing in a warehouse basement actually
          // experiences. Retry instead, and only give up on the session when
          // the server answers and says there are no roles.
          if (e instanceof RolesUnreachableError) {
            void retryRoles(userId, ticket, () => cancelled || ticket !== latest, identity);
            return;
          }

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

  /**
   * Ties Supabase's token refresh to whether the app is actually on screen.
   *
   * `autoRefreshToken` runs on a JS timer, and React Native suspends those
   * once the app is backgrounded. So the refresh scheduled for a token that
   * expires while the phone is in someone's pocket does not happen, and the
   * agent who reopens the app at the next stop is holding an expired one --
   * the first request of the day fails, or they land back on login.
   *
   * Stopping the timer on the way out and starting it again on the way back
   * is Supabase's documented answer: the restart refreshes immediately if the
   * token has aged out, so returning to the app renews it rather than
   * discovering the problem mid-request. It also stops a pointless timer
   * ticking against the battery of a phone that spends all day in a van.
   */
  useEffect(() => {
    supabase.auth.startAutoRefresh();

    const subscription = AppState.addEventListener("change", (state) => {
      // Only "active" is the foreground. iOS reports "inactive" while the app
      // is transitioning or the call banner is up, and treating that as
      // foreground would restart the timer on the way out.
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);
}
