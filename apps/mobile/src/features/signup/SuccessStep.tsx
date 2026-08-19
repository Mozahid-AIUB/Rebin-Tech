import { View } from "react-native";
import { AppText, AuthButton, AuthScreen, authTokens } from "@rebin/ui";
import type { SignupRole } from "@rebin/shared";

// Renders under (auth)/signup/register.tsx once signup succeeds — still
// pre-session (the new user hasn't logged in yet, just registered), so this
// stays on the dark-forest AuthScreen wrapper rather than the cream
// Screen/Card/PillButton wrapped in a PortalThemeProvider.
//
// What happens next genuinely differs by role, so the copy does too: telling a
// supplier we're "verifying your organization" is the kind of leftover
// wrong-audience copy that makes a product feel unfinished.
//
// These read as "here is what you can do" rather than "here is what we will
// do to you" since migration 0017: accounts are active on creation, so there
// is no approval to wait for and promising an approval email would be a lie.
const NEXT_STEPS: Record<SignupRole, readonly [string, string, string]> = {
  organization: [
    "Tell us what you need cleared out",
    "Pick a date and a dock time",
    "We collect it — free, with a recycling record",
  ],
  business: [
    "Scan or list the stock you want to sell",
    "Get a quote against the live catalog",
    "Ship it and get paid",
  ],
  supplier: [
    "Scan or list the stock you want to sell",
    "Get a quote against the live catalog",
    "Ship it to our warehouse and get paid",
  ],
};

const SUBTITLE: Record<SignupRole, string> = {
  organization: "Your organization is set up and ready to book its first pickup.",
  business: "Your business is set up and ready to sell its first batch.",
  supplier: "You're set up and ready to sell your first batch. Ship whenever you're ready.",
};

export function SuccessStep({
  role,
  onContinue,
  continuing = false,
}: {
  role: SignupRole;
  onContinue: () => void;
  continuing?: boolean;
}) {
  const steps = NEXT_STEPS[role];
  return (
    <AuthScreen
      title="You're all set"
      subtitle={SUBTITLE[role]}
      footer={<AuthButton label="Go to my dashboard" onPress={onContinue} loading={continuing} />}
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
