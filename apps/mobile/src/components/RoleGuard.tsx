import type { ReactNode } from "react";
import { Redirect, type Href } from "expo-router";
import { portalForRole, type RoleAssignment } from "@rebin/api";
import { PortalThemeProvider, type PortalKey } from "@rebin/ui";
import { useSessionStore } from "../store/session";

const HOME_BY_PORTAL: Record<PortalKey, string> = {
  org: "/(org)/dashboard",
  business: "/(biz)/dashboard",
  agent: "/(agent)/dispatch",
};

// Expo Router's typed routes (apps/mobile/.expo/types/router.d.ts, codegen'd
// from files that exist under app/) don't yet know about "/login", "/pending",
// "/context-picker", or the three portal dashboard routes — those screens are
// built in Task 10+, not this task. `resolveInitialRoute` above deliberately
// returns a plain `string` (per the brief's literal signature) so it stays a
// pure, Expo-Router-independent function to unit test. Only here, at the
// actual `<Redirect>` JSX boundary, do we need a real `Href`. This cast is
// intentionally scoped to this one conversion point rather than an `any` or a
// blanket `@ts-ignore`: every string it's ever called with is a known,
// hand-authored route name (never unvalidated user input), so the cast can't
// hide a typo class of bug — it only defers path-existence checking to Task
// 10+, when TypeScript's generated route union will include these paths and
// this cast becomes a no-op annotation.
function asHref(path: string): Href {
  return path as Href;
}

export function resolveInitialRoute(state: {
  status: "loading" | "signed-out" | "pending" | "ready";
  assignments: RoleAssignment[];
  hasOnboarded: boolean;
}): string | null {
  if (state.status === "loading") return null;
  if (state.status === "signed-out") return state.hasOnboarded ? "/login" : "/";
  if (state.status === "pending") return "/pending";

  const portals = state.assignments
    .map((a) => portalForRole(a.role))
    .filter((p): p is PortalKey => p !== null);

  if (portals.length === 0) return "/pending";
  if (portals.length > 1) return "/context-picker";
  return HOME_BY_PORTAL[portals[0]!];
}

export function RoleGuard({ portal, children }: { portal: PortalKey; children: ReactNode }) {
  const { status, assignments, activeIndex } = useSessionStore();

  if (status === "loading") return null;
  if (status === "signed-out") return <Redirect href={asHref("/login")} />;
  if (status === "pending") return <Redirect href={asHref("/pending")} />;

  const active = assignments[activeIndex];
  const activePortal = active ? portalForRole(active.role) : null;
  if (activePortal !== portal) {
    return <Redirect href={asHref(activePortal ? HOME_BY_PORTAL[activePortal] : "/pending")} />;
  }

  return <PortalThemeProvider portal={portal}>{children}</PortalThemeProvider>;
}
