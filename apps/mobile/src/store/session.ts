// Thin re-export for app-local discoverability. The store itself (Step 5 of
// task-8-brief.md) lives in @rebin/api (packages/api/src/hooks/useSession.ts):
// packages must not depend on apps, so the Zustand `create()` call cannot live
// here and be consumed by packages/api — see the reasoning comment in that
// file for the full explanation of this ambiguity and its resolution.
export { useSessionStore } from "@rebin/api";
export type { SessionState } from "@rebin/api";
