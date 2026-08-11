import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText, Card, PillButton, Screen, tokens } from "@rebin/ui";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The shared frame every portal home shares: greeting, the account you're in,
 * then portal-specific content.
 *
 * Extracted once the business and agent portals arrived rather than copying
 * the organization dashboard's header three times.
 *
 * It also carried a "Verification in review" notice until migration 0017 made
 * signup grant access outright; there is no review queue left to report.
 */
export function PortalHome({
  firstName,
  accountName,
  loading,
  error,
  onRetry,
  children,
}: {
  firstName: string | null;
  accountName: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: ReactNode;
}) {
  const hello = greeting(new Date().getHours());

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <AppText variant="display">{firstName ? `${hello}, ${firstName}` : hello}</AppText>
        {accountName ? <AppText variant="body" tone="muted">{accountName}</AppText> : null}
      </View>

      {loading ? (
        <AppText variant="body" tone="muted">Loading…</AppText>
      ) : error ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load this screen</AppText>
          <AppText variant="bodySm" tone="muted">{error}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={onRetry} />
        </Card>
      ) : (
        children
      )}
    </Screen>
  );
}