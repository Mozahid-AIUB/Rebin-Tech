import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AUTH_ROLE_ACCENTS, AppText, AuthScreen, RoleCard, authTokens } from "@rebin/ui";
import { BusinessIcon, OrgIcon, SupplierIcon } from "../../../src/features/signup/RoleIcons";

// See login.tsx's own `asHref` for the identical reasoning: these are known,
// hand-authored route names, never unvalidated user input.
function asHref(path: string): Href {
  return path as Href;
}

// Ordered by expected volume, not alphabetically: organizations are the
// primary onboarding path this product opens with, and the first card is the
// one most people tap. Copy is intentionally concrete (named audiences and
// real actions, not "manage your workflow") -- generic benefit copy is the
// single loudest tell that a screen wasn't written for a real audience.
//
// US market: US spelling and US-shaped examples throughout ("centers", not
// "centres"). Step1Org's org-name placeholder was carrying a Bangladesh
// example and has been changed for the same reason.
const ROLES = [
  {
    key: "org",
    signupRole: "organization",
    title: "Organization",
    audience: "Schools, hospitals, offices",
    points: ["Book bulk e-waste pickups", "Get verified disposal reports", "Add your team to one account"],
    Icon: OrgIcon,
  },
  {
    key: "business",
    signupRole: "business",
    title: "Business owner",
    audience: "Shops, repair centers, traders",
    points: ["List scrap stock for sale", "Compare buyer price offers", "Track payouts in one place"],
    Icon: BusinessIcon,
  },
  {
    key: "supplier",
    signupRole: "supplier",
    title: "Supplier",
    // Named for what the person does, not for what the schema calls them: a
    // shop owner reading "supplier" cannot tell whether it means him.
    audience: "Independent collectors, garages, side buyers",
    // Not "same price as a business": a one-man collector has no idea what a
    // business is paid, so a comparison he cannot check is not reassurance.
    // What he is actually worried about is being paid less for being small.
    points: [
      "The same rates our largest sellers get",
      "Ship stock in on your schedule",
      "No EIN or paperwork to start",
    ],
    Icon: SupplierIcon,
  },
] as const;

export default function SignupRolePicker() {
  const router = useRouter();

  return (
    <AuthScreen
      title="How will you use Rebin?"
      // The three cards below list what each account gets, the same shape a
      // paid-tier picker uses -- and Apple's reviewer read it as exactly
      // that, rejecting the app under 3.1.1 for "external mechanisms for
      // purchases or subscriptions" on a screen where nothing is purchased.
      // Every account here is free; the business/supplier cards are the
      // ones a reviewer skimming for pricing language would land on
      // ("Compare buyer price offers," "Track payouts"), so the
      // disambiguation belongs on this screen, read before any of them.
      subtitle="Pick the one that fits you. Every account is free — you get paid for the e-waste you provide, you never pay us. This sets up the right account — you can't switch it later without support."
      onBack={() => router.back()}
      backLabel="Back to log in"
      theme="light"
    >
      <View style={{ marginTop: 2, gap: 10 }}>
        {ROLES.map((role) => (
          <RoleCard
            key={role.key}
            title={role.title}
            audience={role.audience}
            points={role.points}
            accent={AUTH_ROLE_ACCENTS[role.key]}
            icon={<role.Icon color={AUTH_ROLE_ACCENTS[role.key]} />}
            // All three cards open the same form; the card just preselects
            // the role dropdown at the top of it. Separate per-role screens
            // were three copies of one page that differed by four fields.
            onPress={() => router.push(asHref(`/signup/register?role=${role.signupRole}`))}
          />
        ))}
      </View>

      <AppText
        variant="bodySm"
        style={{ marginTop: 14, color: authTokens.muted, opacity: 0.72, textAlign: "center" }}
      >
        Not sure which one? Organization is right for most workplaces.
      </AppText>
    </AuthScreen>
  );
}
