import { create } from "zustand";
import type { RoleAssignment } from "../auth";

type SessionState = {
  status: "loading" | "signed-out" | "pending" | "ready";
  userId: string | null;
  assignments: RoleAssignment[];
  activeIndex: number;
  setSignedOut: () => void;
  setSession: (userId: string, assignments: RoleAssignment[], accountActive: boolean) => void;
  setActiveIndex: (index: number) => void;
};

/**
 * The brief's "Produces" interface (task-8-brief.md line 18) lists
 * `useSession(): { status, userId, assignments, activeIndex }` as an export of
 * `packages/api`, with a file slot at `packages/api/src/hooks/useSession.ts`.
 * Step 5's literal code, however, only shows a Zustand store (`useSessionStore`)
 * living in `apps/mobile/src/store/session.ts`.
 *
 * Resolution: Zustand's `create()` return value IS a React hook by design —
 * calling it (or `useSessionStore((s) => s.foo)`) works as a hook. So the
 * literal Step 5 store *is* the `useSession()` the interface list describes;
 * there's no separate hook to invent. The only real question is which package
 * should own the `create()` call, since the brief's own dependency rule is
 * packages -> apps consumption, never the reverse for shared logic.
 *
 * Putting `create()` in apps/mobile (per Step 5's literal path) and then having
 * packages/api "re-export" it would require packages/api to import from
 * apps/mobile — backwards. So the store factory itself lives here, in
 * packages/api (which is what the interface list says produces it), using the
 * exact state shape and transitions from Step 5. `apps/mobile/src/store/session.ts`
 * re-exports this for app-local convenience/discoverability, satisfying the
 * Files list without duplicating the store or inverting the dependency graph.
 */
export const useSessionStore = create<SessionState>((set) => ({
  status: "loading",
  userId: null,
  assignments: [],
  activeIndex: 0,
  setSignedOut: () => set({ status: "signed-out", userId: null, assignments: [], activeIndex: 0 }),
  setSession: (userId, assignments, accountActive) =>
    set({ status: accountActive ? "ready" : "pending", userId, assignments, activeIndex: 0 }),
  setActiveIndex: (activeIndex) => set({ activeIndex }),
}));

/**
 * Alias matching the brief's literal "Produces" interface name (task-8-brief.md
 * line 18: `useSession(): {...}`). `useSessionStore` is the real implementation
 * (kept as the primary export name for clarity that it's a Zustand store, not
 * a bespoke hook) — this is a zero-behavior-change re-export so a consumer
 * grepping for `useSession` per the spec finds it directly.
 */
export const useSession = useSessionStore;

export type { SessionState };
