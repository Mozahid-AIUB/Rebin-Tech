import { useState } from "react";
import { useRouter, type Href } from "expo-router";
import { resolveRoles, signIn } from "@rebin/api";
import type { LoginInput } from "@rebin/shared";
import { resolveInitialRoute } from "../components/RoleGuard";
import { useSessionStore } from "../store/session";

// See RoleGuard.tsx's own `asHref` for the identical reasoning:
// `resolveInitialRoute` — per its literal Task 9 brief signature — returns a
// plain `string` so it stays a pure, Expo-Router-independent function to
// unit test. Expo Router's codegen'd route typing doesn't know about every
// string it can return (e.g. "/pending", "/context-picker" don't have
// screens until later tasks), so this cast is scoped to this one conversion
// point rather than a blanket `any` or `@ts-ignore` — every string
// `resolveInitialRoute` can produce is a known, hand-authored route name,
// never unvalidated user input.
function asHref(path: string): Href {
  return path as Href;
}

export function useLogin() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(values: LoginInput) {
    setIsPending(true);
    setError(null);
    try {
      const { userId } = await signIn(values.email, values.password);
      const assignments = await resolveRoles(userId);
      setSession(userId, assignments, assignments.length > 0);
      const route = resolveInitialRoute({
        status: assignments.length > 0 ? "ready" : "pending",
        assignments,
        hasOnboarded: true,
      });
      if (route) router.replace(asHref(route));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to log in. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  return { submit, isPending, error };
}
