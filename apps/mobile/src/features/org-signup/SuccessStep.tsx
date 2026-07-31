import { View } from "react-native";
import { AppText, AuthButton, AuthScreen, authTokens } from "@rebin/ui";

// Renders under (auth)/signup/organization.tsx once signup succeeds — still
// pre-session (the new user hasn't logged in yet, just registered), so this
// stays on the dark-forest AuthScreen wrapper, same as every other step in
// this wizard, rather than the brief's literal cream Screen/Card/PillButton
// wrapped in a PortalThemeProvider.
const CONFIRMATION_STEPS = [
  "We verify your organization details",
  "You receive an approval email",
  "Schedule your first free pickup",
];

export function SuccessStep({ onContinue }: { onContinue: () => void }) {
  return (
    <AuthScreen
      title="Registration submitted"
      subtitle="Your organization is queued for verification. We typically approve within one business day."
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
        {CONFIRMATION_STEPS.map((line, i) => (
          <View key={line} style={{ flexDirection: "row", gap: 8 }}>
            <AppText style={{ color: authTokens.primary }}>{i + 1}.</AppText>
            <AppText variant="bodySm" style={{ color: authTokens.text, flex: 1 }}>{line}</AppText>
          </View>
        ))}
      </View>
    </AuthScreen>
  );
}
