import { View } from "react-native";
import { AppText, AuthButton, AuthScreen, authTokens } from "@rebin/ui";
import type { SignupRole } from "@rebin/shared";

// Renders under (auth)/signup/register.tsx once signup succeeds — still
// pre-session (the new user hasn't logged in yet, just registered), so this
// stays on the dark-forest AuthScreen wrapper rather than the cream
// Screen/Card/PillButton wrapped in a PortalThemeProvider.
//
// What happens next genuinely differs by role, so the copy does too: telling a
// field agent we're "verifying your organization" is the kind of leftover
// wrong-audience copy that makes a product feel unfinished.
const NEXT_STEPS: Record<SignupRole, readonly [string, string, string]> = {
  organization: [
    "We verify your organization details",
    "You receive an approval email",
    "Schedule your first free pickup",
  ],
  business: [
    "We verify your business details",
    "You receive an approval email",
    "List your first batch of stock",
  ],
  agent: [
    "We check your service area and vehicle",
    "You receive an approval email",
    "Your first pickups get assigned",
  ],
};

const SUBTITLE: Record<SignupRole, string> = {
  organization: "Your organization is queued for verification. We typically approve within one business day.",
  business: "Your business is queued for verification. We typically approve within one business day.",
  agent: "Your agent profile is queued for review. We typically approve within one business day.",
};

export function SuccessStep({ role, onContinue }: { role: SignupRole; onContinue: () => void }) {
  const steps = NEXT_STEPS[role];
  return (
    <AuthScreen
      title="Registration submitted"
      subtitle={SUBTITLE[role]}
      footer={<AuthButton label="Continue" onPress={onContinue} />}
    >
      <View
        style={{
          gap: 12,
          padding: 16,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: authTokens.border,
          backgroundColor: authTokens.surface,
        }}
      >
        {steps.map((line, i) => (
          <View key={line} style={{ flexDirection: "row", gap: 8 }}>
            <AppText style={{ color: authTokens.primary }}>{i + 1}.</AppText>
            <AppText variant="bodySm" style={{ color: authTokens.text, flex: 1 }}>{line}</AppText>
          </View>
        ))}
      </View>
    </AuthScreen>
  );
}
