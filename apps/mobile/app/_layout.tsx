import { Redirect, Stack, usePathname, type Href } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSessionStore } from "../src/store/session";
import { resolveInitialRoute } from "../src/components/RoleGuard";

// Deferred from Task 9 (see task-9-report.md): RoleGuard.tsx and the three
// portal route-group layouts were built there, but wiring THIS root layout to
// actually call `resolveInitialRoute()` on boot was explicitly pushed to Task
// 10 — Task 9 had no real screens yet for a redirect to land on.
//
// `/` was originally S02 Portal Select (a portal picker); per a later,
// human-directed simplification it is now a single splash screen whose
// "Get Started" CTA goes straight to `/login` (see commit
// "feat(mobile): send Get Started straight to Login, drop portal-select").
// `resolveInitialRoute` still returns "/" for a true first-launch
// signed-out user — that's just the splash now, not a portal chooser — so
// none of the redirect logic below needed to change, only this comment.
//
// `hasOnboarded` simplification: `resolveInitialRoute` (task-9-report.md)
// takes a `hasOnboarded: boolean` per its literal brief signature, used to
// distinguish a true first-launch signed-out user (-> "/", the splash)
// from a returning signed-out user (-> "/login"). No task up to and
// including this one builds persistent storage for that flag (no MMKV/
// AsyncStorage-backed "has this device completed onboarding" flag exists
// anywhere in the repo — confirmed by grep). Inventing that persistence
// subsystem here would be scope creep beyond this task's Files list. The
// correct, minimal choice for Phase-0 is to default `hasOnboarded` to
// `false`: every session is treated as first-launch until a later task
// adds real persistence for this specific flag. This is intentionally
// conservative — worst case a returning signed-out user sees the splash
// once more instead of jumping straight to /login, never the other way
// around — and `resolveInitialRoute` already returns "/" for exactly that
// state, so this root layout doesn't redirect away from the screen the
// user is already on.
const HAS_ONBOARDED = false;

// See RoleGuard.tsx's own `asHref` for the identical reasoning: Expo Router's
// codegen'd route typing doesn't yet know about every string
// `resolveInitialRoute` can return (e.g. "/login", "/pending",
// "/context-picker" don't have screens until Task 10+/11+), so this cast is
// scoped to this one conversion point rather than a blanket `any`.
function asHref(path: string): Href {
  return path as Href;
}

function RootRedirect() {
  const { status, assignments } = useSessionStore();
  const pathname = usePathname();

  // This is a boot-time entry-point decision, not a persistent per-navigation
  // guard (that job belongs to RoleGuard, per-portal, from Task 9). Only
  // evaluate `resolveInitialRoute` when the user is sitting at the app's
  // literal entry route ("/", the splash — where Expo Router always lands
  // first on cold start). Restricting to "/" also structurally guarantees
  // this never fires on any in-app route the user has since navigated to
  // (e.g. a signed-in org user browsing "/(org)/settings" must never get
  // bounced back to "/(org)/dashboard" just because that's their resolved
  // home) — RoleGuard already owns keeping
  // signed-in users inside their correct portal on every other route.
  if (pathname !== "/") return null;

  const target = resolveInitialRoute({ status, assignments, hasOnboarded: HAS_ONBOARDED });

  // `loading` -> null: nothing resolved yet, render children as-is (no
  // redirect while session hydration is in flight).
  if (target === null) return null;

  // resolveInitialRoute returns "/" itself for a first-launch signed-out
  // user — the splash is the correct, intentional destination for that
  // case, so this is a deliberate no-op, not a special case to strip out.
  if (target === "/") return null;

  return <Redirect href={asHref(target)} />;
}

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <RootRedirect />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F6F4ED" } }} />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}
