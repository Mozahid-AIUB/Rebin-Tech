import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { listRecentPickupRequests, useSessionStore, type PickupRequestRow } from "@rebin/api";
import { formatUsDate } from "@rebin/shared";
import {
  AppText,
  Card,
  EmptyState,
  PillButton,
  Screen,
  StatusBadge,
  tokens,
} from "@rebin/ui";

// Same fixed zone as the dashboard, for the same reason: organizations
// .facility_timezone isn't in this read yet, and a date that shifts with the
// viewer's phone clock is worse than one that's consistently US Eastern.
const ORG_TZ = "America/New_York";

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
            <Card key={row.id} style={{ gap: tokens.space[1] }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <AppText variant="h3">{`${row.unitCount} devices`}</AppText>
                <StatusBadge status={row.status} />
              </View>
              <AppText variant="bodySm" tone="muted">
                {`Requested ${formatUsDate(row.createdAt, ORG_TZ)}`}
              </AppText>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
