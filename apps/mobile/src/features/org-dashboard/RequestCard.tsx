import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import type { PickupRequestRow } from "@rebin/api";
import { formatUsDate } from "@rebin/shared";
import { AppText, Card, StatusBadge, tokens } from "@rebin/ui";

// See login.tsx's own `asHref` for the identical reasoning: a hand-authored
// route name with an id we just read back from our own database.
function asHref(path: string): Href {
  return path as Href;
}

// organizations.facility_timezone isn't in the list reads yet, so dates render
// in a fixed US zone rather than drifting with each viewer's phone clock. The
// detail screen uses the request's own stored timezone; this follows once the
// list query carries it too.
const ORG_TZ = "America/New_York";

/**
 * One pickup request in a list, tappable through to S29.
 *
 * Shared by the dashboard's recent-requests strip and the Requests tab, which
 * had drifted into two copies of the same card.
 */
export function RequestCard({ request }: { request: PickupRequestRow }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${request.unitCount} devices, ${request.status}`}
      onPress={() => router.push(asHref(`/(org)/request/${request.id}`))}
    >
      <Card style={{ gap: tokens.space[1] }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText variant="h3">{`${request.unitCount} devices`}</AppText>
          <StatusBadge status={request.status} />
        </View>
        <AppText variant="bodySm" tone="muted">
          {`Requested ${formatUsDate(request.createdAt, ORG_TZ)}`}
        </AppText>
      </Card>
    </Pressable>
  );
}
