import { AppText, EmptyState, Screen } from "@rebin/ui";

// The agent's home. Real assignments need a dispatch/assignment table and a
// status-transition path, neither of which exists yet (see roadmap step 4), so
// there is genuinely nothing to list -- and nothing here pretends otherwise.
export default function AgentDispatch() {
  return (
    <Screen>
      <AppText variant="display">Dispatch</AppText>
      <EmptyState
        title="No jobs assigned"
        body="Pickups assigned to you will appear here, in the order you should run them."
      />
    </Screen>
  );
}
