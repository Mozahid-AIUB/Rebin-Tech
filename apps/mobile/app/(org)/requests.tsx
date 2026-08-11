import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { listRecentPickupRequests, useSessionStore, type PickupRequestRow } from "@rebin/api";
import { AppText, Card, EmptyState, PillButton, Screen, tokens } from "@rebin/ui";
import { RequestCard } from "../../src/features/org-dashboard/RequestCard";

// The plan's S30 adds status filter chips, ID search and infinite scroll. Those
// are worth building against a list long enough to need them -- with no way to
// create a request yet (the booking wizard is the next step), every org has
// zero. Ships as a plain list; the controls come with the data.
const PAGE_SIZE = 50;

export default function OrgRequests() {
  const { assignments, activeIndex } = useSessionStore();
  const active = assignments[activeIndex];
  const orgId = active?.scopeType === "organization" ? active.scopeId : null;

  const [rows, setRows] = useState<PickupRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      setError("No organization is active for this account.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRows(await listRecentPickupRequests(orgId, PAGE_SIZE));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your requests.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <AppText variant="display">Requests</AppText>

      {loading ? (
        <AppText variant="body" tone="muted">Loading your requests…</AppText>
      ) : error ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load your requests</AppText>
          <AppText variant="bodySm" tone="muted">{error}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={() => void load()} />
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No requests yet"
          body="Every pickup you schedule will appear here with its current status."
        />
      ) : (
        <View style={{ gap: tokens.space[2] }}>
          {rows.map((row) => (
            <RequestCard key={row.id} request={row} />
          ))}
        </View>
      )}
    </Screen>
  );
}
