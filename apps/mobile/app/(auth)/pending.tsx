import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AppText, AuthButton, AuthScreen, authTokens } from "@rebin/ui";
import { useSessionStore } from "../../src/store/session";
import { useLogout } from "../../src/hooks/useLogout";

// See login.tsx's own `asHref` for the identical reasoning: a known,
// hand-authored route name, never unvalidated user input.
function asHref(path: string): Href {
  return path as Href;
}

// NOTE: deviation from the plan's literal Task 13 code, which wraps this in a
// PortalThemeProvider + cream `Screen`. This screen is reached straight from
// the dark-forest signup success step and is still pre-access (the user has no
// portal yet -- that's the whole point of the screen), so it keeps the
// dark-forest AuthScreen wrapper. Same reasoning already applied and
// documented in SuccessStep.tsx. The copy, the role-specific branching and the
// log-out escape hatch are the plan's, unchanged.
type PendingCopy = { title: string; body: string; ctaLabel?: string; ctaRoute?: string };

const COPY = {
  org: {
    title: "Verification in review",
    body: "We're confirming your organization details. Approvals typically complete within one business day, and we'll email you the moment you're cleared.",
  },
  business: {
    title: "Finish your payout setup",
    body: "Your account is created. Complete secure payout onboarding so we can send funds when your scrap is settled.",
    ctaLabel: "Continue setup",
    ctaRoute: "/(biz)/payout-method",
  },
  agent: {
    title: "Awaiting fleet approval",
    body: "Your fleet manager needs to activate your account before jobs appear in your queue.",
  },
  none: {
    title: "No portal access yet",
    body: "This account has no assigned role. Contact your administrator or Rebin Tech support.",
  },
} satisfies Record<string, PendingCopy>;

// Matches on the role prefix rather than listing all eleven roles: every
// org_*/biz_*/field_* role waits on the same thing, and a role added later
// falls into the right bucket without touching this file.
function copyKey(role: string | undefined): keyof typeof COPY {
  if (!role) return "none";
  if (role.startsWith("org_")) return "org";
  if (role.startsWith("biz_")) return "business";
  if (role.startsWith("field_")) return "agent";
  return "none";
}

export default function Pending() {
  const router = useRouter();
  const { assignments, activeIndex } = useSessionStore();
  const { logout, pending } = useLogout();
  const copy: PendingCopy = COPY[copyKey(assignments[activeIndex]?.role)];

  return (
    <AuthScreen
      title={copy.title}
      subtitle="Account status"
      footer={
        <View style={{ gap: 10 }}>
          {copy.ctaLabel && copy.ctaRoute ? (
            <AuthButton label={copy.ctaLabel} onPress={() => router.push(asHref(copy.ctaRoute!))} />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log Out"
            accessibilityState={{ busy: pending }}
            onPress={() => void logout()}
            style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
          >
            <AppText variant="h3" style={{ color: authTokens.text }}>Log Out</AppText>
          </Pressable>
        </View>
      }
    >
      <View
        style={{
          padding: 16,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: authTokens.border,
          backgroundColor: authTokens.surface,
        }}
      >
        <AppText variant="body" style={{ color: authTokens.muted }}>{copy.body}</AppText>
      </View>

      <AppText variant="bodySm" style={{ marginTop: 4, color: authTokens.muted, opacity: 0.72 }}>
        Questions? Call 1-800-555-EWASTE or email support@rebintech.com.
      </AppText>
    </AuthScreen>
  );
}
