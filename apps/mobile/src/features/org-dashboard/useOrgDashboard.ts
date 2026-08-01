import { useCallback, useEffect, useState } from "react";
import {
  getOrganization,
  getProfileName,
  listRecentPickupRequests,
  useSessionStore,
  type OrgSummary,
  type PickupRequestRow,
} from "@rebin/api";

type State = {
  loading: boolean;
  error: string | null;
  firstName: string | null;
  org: OrgSummary | null;
  requests: PickupRequestRow[];
};

const INITIAL: State = { loading: true, error: null, firstName: null, org: null, requests: [] };

/** "Karim Rahman" -> "Karim". The greeting is first-name only. */
function firstNameOf(fullName: string | null): string | null {
  return fullName?.trim().split(/\s+/)[0] ?? null;
}

/**
 * Everything S22 renders, in one load.
 *
 * The three reads are independent, so they run in parallel -- serialising them
 * would make the dashboard three round-trips slow for no reason. They're also
 * failed together: a dashboard showing a greeting but no request list is
 * harder to reason about than one honest error with a retry.
 */
export function useOrgDashboard() {
  const { userId, assignments, activeIndex } = useSessionStore();
  const active = assignments[activeIndex];
  const orgId = active?.scopeType === "organization" ? active.scopeId : null;

  const [state, setState] = useState<State>(INITIAL);

  const load = useCallback(async () => {
    if (!userId || !orgId) {
      // RoleGuard should make this unreachable; if it ever happens, say so
      // rather than rendering an empty dashboard that looks like a new account.
      setState({ ...INITIAL, loading: false, error: "No organization is active for this account." });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [fullName, org, requests] = await Promise.all([
        getProfileName(userId),
        getOrganization(orgId),
        listRecentPickupRequests(orgId),
      ]);
      setState({ loading: false, error: null, firstName: firstNameOf(fullName), org, requests });
    } catch (e) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: e instanceof Error ? e.message : "Couldn't load your dashboard.",
      }));
    }
  }, [userId, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
