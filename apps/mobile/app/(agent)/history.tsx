import { AppText, EmptyState, Screen } from "@rebin/ui";

// Completed work. Deliberately not "Earnings": settlement math depends on the
// price catalog (P3) and payouts (P4), so a money screen could only show
// $0.00 today -- worse than not claiming to track money yet.
export default function AgentHistory() {
  return (
    <Screen>
      <AppText variant="display">History</AppText>
      <EmptyState
        title="No completed jobs"
        body="Every pickup you finish will be listed here with its date and weight."
      />
    </Screen>
  );
}
