import { useCallback, useState } from "react";
import {
  getOrgSummary,
  getOrganization,
  getProfileName,
  listRecentPickupRequests,
  useSessionStore,
  type OrgSummary,
  type OrgSummary2,
  type PickupRequestRow,
} from "@rebin/api";
import { useLoader } from "../../hooks/useLoader";

type State = {
  firstName: string | null;
  org: OrgSummary | null;
  requests: PickupRequestRow[];
  /** Lifetime figures, computed in the database -- see getOrgSummary. */
  summary: OrgSummary2 | null;
};

const INITIAL: State = { firstName: null, org: null, requests: [], summary: null };

/** "Karim Rahman" -> "Karim". The greeting is first-name only. */
function firstNameOf(fullName: string | null): string | null {
  return fullName?.trim().split(/\s+/)[0] ?? null;
}

/**
 * Everything S22 renders, in one load.
 *
 * The four reads are independent, so they run in parallel -- serialising them
 * would make the dashboard four round-trips slow for no reason. They're also
 * failed together: a dashboard showing a greeting but no request list is
 * harder to reason about than one honest error with a retry.
 *
 * Loading state belongs to useLoader, which keeps the last good dashboard on
 * screen while a refresh runs rather than replacing it with a spinner.
 */
export function useOrgDashboard() {
  const { userId, assignments, activeIndex } = useSessionStore();
  const active = assignments[activeIndex];
  const orgId = active?.scopeType === "organization" ? active.scopeId : null;

  const [state, setState] = useState<State>(INITIAL);

  const { loading, error, reload } = useLoader(
    useCallback(async () => {
      // RoleGuard should make this unreachable; if it ever happens, say so
      // rather than rendering an empty dashboard that looks like a new account.
      if (!userId || !orgId) throw new Error("No organization is active for this account.");

      const [fullName, org, requests, summary] = await Promise.all([
        getProfileName(userId),
        getOrganization(orgId),
        listRecentPickupRequests(orgId),
        getOrgSummary(orgId),
      ]);
      setState({ firstName: firstNameOf(fullName), org, requests, summary });
    }, [userId, orgId]),
  );

  return { ...state, loading, error, reload };
}
