import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { formatUsDate } from "@rebin/shared";
import {
  AppText,
  Card,
  EmptyState,
  PillButton,
  Screen,
  SectionHeader,
  StatRow,
  StatTile,
  tokens,
} from "@rebin/ui";
import { RequestCard } from "../../src/features/org-dashboard/RequestCard";
import { useOrgDashboard } from "../../src/features/org-dashboard/useOrgDashboard";

// S22. Three stats, the request list, and the one action this portal is for.
//
// "Devices recycled" is real as of the field agent portal: a request can now
// reach 'completed', and the number counts what an agent put on the truck
// rather than what was booked -- the two differ on most collections.
//
// Certificates is still the missing fourth tile. There is no certificates
// table, so it would be the permanent zero this row exists to avoid.
//
// The plan's quick-access grid is also absent, and not only for missing
// destinations. With three tabs and this portal's small screen set, every tile
// it could hold is already one tap away: Requests is a tab, Organization sits
// on the Me screen. A grid of shortcuts to places the navigation already
// reaches is a second route to the same screen, which makes an app feel larger
// than it is without making anything easier to find.
//
// It earns its place when there are destinations the tabs do not reach --
// Certificates, Catalog, Team -- and enough of them to read as a grid.
//
// The CTA lives in the footer rather than a card at the top: booking is the
// only thing this portal is for, and it should stay under the thumb while the
// request list scrolls.

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

// See login.tsx's own `asHref` for the identical reasoning: hand-authored
// route names, never unvalidated input.
function asHref(path: string): Href {
  return path as Href;
}

export default function OrgDashboard() {
  const router = useRouter();
  const { loading, error, firstName, org, requests, summary, reload } = useOrgDashboard();

  return (
    <Screen
      // The CTA sits in the footer rather than in a card up top. Booking a
      // pickup is the only thing this portal exists to do, so it stays in
      // reach while the request list scrolls instead of leaving the screen
      // -- and a thumb reaches the bottom of a phone, not the middle.
      footer={
        <View style={{ gap: tokens.space[1] }}>
          <PillButton label="Schedule Free Pickup" onPress={() => router.push("/(org)/request/new")} />
          <AppText variant="bodySm" tone="muted" style={{ textAlign: "center" }}>
            Free · 10 devices or more · collected from your dock
          </AppText>
        </View>
      }
    >
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
          <StatRow>
            <StatTile value={String(summary?.activeCount ?? 0)} label="ACTIVE" tone="accent" />
            <StatTile
              // The payoff of the agent portal: this counts what agents put on
              // the truck, so it stops being a permanent zero the first time a
              // pickup is collected.
              value={String(summary?.devicesRecycled ?? 0)}
              label="RECYCLED"
              tone={(summary?.devicesRecycled ?? 0) > 0 ? "default" : "muted"}
            />
            <StatTile
              // An em dash rather than a date-shaped placeholder: "--" reads as
              // "nothing booked", where "00/00/0000" reads as broken.
              value={summary?.nextPickup ? formatUsDate(summary.nextPickup, ORG_TZ).slice(0, 5) : "—"}
              label="NEXT PICKUP"
              tone={summary?.nextPickup ? "default" : "muted"}
            />
          </StatRow>

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