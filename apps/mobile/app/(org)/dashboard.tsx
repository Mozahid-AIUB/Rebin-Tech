import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  AppText,
  Card,
  EmptyState,
  PillButton,
  Screen,
  SectionHeader,
  tokens,
} from "@rebin/ui";
import { RequestCard } from "../../src/features/org-dashboard/RequestCard";
import { useOrgDashboard } from "../../src/features/org-dashboard/useOrgDashboard";

// NOTE ON SCOPE. The plan's S22 also specifies a four-stat row (Active
// Requests · Devices Recycled · Certificates · Next Pickup) and a quick-access
// grid (Requests · Team · Certificates · Catalog). Both are deliberately left
// out of this first pass:
//
//   - "Devices Recycled" and "Certificates" have no data source at all. There
//     is no certificates table, and no path for a request to reach 'completed'
//     (no dispatch/assignment table, no status-transition RPC). Those tiles
//     could only ever render 0 or a fabricated number.
//   - The quick-access grid links to Requests/Team/Certificates/Catalog, none
//     of which have screens yet, so every tile would be a dead tap.
//
// They come back with the features that produce them (roadmap steps 3-5).
// What ships here is only what is genuinely backed by data today.

// organizations.facility_timezone defaults to America/New_York and isn't in
// the dashboard's read yet. Formatting in a fixed US zone keeps "Requested
// 08/01/2026" stable for every viewer of the same org, rather than shifting
// with the phone's clock; swap to the org's real zone when the request detail
// screen (S29) starts reading it.
const ORG_TZ = "America/New_York";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function OrgDashboard() {
  const router = useRouter();
  const { loading, error, firstName, org, requests, reload } = useOrgDashboard();

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <AppText variant="display">
          {firstName ? `${greeting(new Date().getHours())}, ${firstName}` : greeting(new Date().getHours())}
        </AppText>
        {org ? <AppText variant="body" tone="muted">{org.name}</AppText> : null}
      </View>

      {loading ? (
        <AppText variant="body" tone="muted">Loading your dashboard…</AppText>
      ) : error ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load your dashboard</AppText>
          <AppText variant="bodySm" tone="muted">{error}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={() => void reload()} />
        </Card>
      ) : (
        <>
          <Card accentBorder style={{ gap: tokens.space[2] }}>
            <AppText variant="label" tone="accent">10+ DEVICE MINIMUM</AppText>
            <AppText variant="h2">Schedule a free pickup</AppText>
            <AppText variant="bodySm" tone="secondary">
              Bulk e-waste removal from your loading dock, at no cost.
            </AppText>
            {/* The wizard UI (S23-S26 + review/confirm) is built at
                request/new.tsx, but it doesn't submit to the API yet -- see
                the note at the top of that file for what's left. Enabled here
                so the flow is clickable end-to-end for review. */}
            <PillButton label="Schedule Free Pickup" onPress={() => router.push("/(org)/request/new")} />
          </Card>

          {/* Visual placeholder only -- there's no budget/savings data source
              yet (no completed-pickup or valuation records), same reason the
              stat row above is deferred. Real numbers land with roadmap
              step 4 (payouts/valuation). */}
          <Card style={{ gap: tokens.space[2] }}>
            <AppText variant="label" tone="accent">YOUR IMPACT</AppText>
            <AppText variant="h2">Budget & savings</AppText>
            <AppText variant="bodySm" tone="secondary">
              Track what recycling with us saves your organization, once pickups start completing.
            </AppText>
            <AppText variant="bodySm" tone="muted">Coming with the next release.</AppText>
          </Card>

          <SectionHeader title="Submitted requests" />
          {requests.length === 0 ? (
            <EmptyState
              title="No pickups yet"
              body="Schedule your first free removal and it will show up here."
            />
          ) : (
            <View style={{ gap: tokens.space[2] }}>
              {requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}