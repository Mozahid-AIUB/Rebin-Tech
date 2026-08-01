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
 * a verification notice while one is pending, then portal-specific content.
 *
 * Extracted once the business and agent portals arrived rather than copying
 * the organization dashboard's header three times.
 */
export function PortalHome({
  firstName,
  accountName,
  pendingVerification,
  loading,
  error,
  onRetry,
  children,
}: {
  firstName: string | null;
  accountName: string | null;
  pendingVerification: boolean;
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
        <>
          {/* Only while it's still pending -- an "Active" badge on every visit
              is noise. */}
          {pendingVerification ? (
            <Card variant="alt" style={{ gap: tokens.space[1] }}>
              <AppText variant="h3">Verification in review</AppText>
              <AppText variant="bodySm" tone="muted">
                You can explore the app now. Full access opens once you&apos;re approved.
              </AppText>
            </Card>
          ) : null}
          {children}
        </>
      )}
    </Screen>
  );
}