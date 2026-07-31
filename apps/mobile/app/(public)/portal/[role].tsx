import { View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { AppText, Card, PillButton, PortalThemeProvider, Screen, tokens, type PortalKey } from "@rebin/ui";
import { PORTAL_CONTENT } from "../../../src/config/portals";

// Same reasoning as index.tsx's `asHref` / RoleGuard.tsx's `asHref`: the
// checked-in Expo Router typed-routes codegen doesn't know about
// "/signup/organization", "/signup/business", "/signup/agent", or "/login"
// yet — none of those screens exist as of this task. Every value passed
// through this cast is a known, hand-authored route string (PORTAL_CONTENT's
// signupRoute fields, or the literal "/login"), never unvalidated input.
function asHref(path: string): Href {
  return path as Href;
}

export default function PortalLanding() {
  const { role } = useLocalSearchParams<{ role: PortalKey }>();
  const router = useRouter();
  const p = PORTAL_CONTENT[role] ?? PORTAL_CONTENT.org;

  return (
    <PortalThemeProvider portal={p.key}>
      <Screen
        footer={
          <View style={{ gap: tokens.space[2] }}>
            <PillButton
              label={p.inviteOnly ? "I have an invite link" : "Sign Up"}
              onPress={() => router.push(asHref(p.signupRoute))}
            />
            <PillButton label="Log In" variant="ghost" onPress={() => router.push(asHref("/login"))} />
          </View>
        }
      >
        <AppText variant="label" tone="accent">{p.badge}</AppText>
        <AppText variant="display">{p.title}</AppText>
        <AppText variant="h3" tone="accent">{p.tagline}</AppText>
        <AppText variant="body" tone="muted">{p.description}</AppText>
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          {p.benefits.map((b) => (
            <View key={b} style={{ flexDirection: "row", gap: tokens.space[2] }}>
              <AppText tone="accent">✓</AppText>
              <AppText variant="bodySm" style={{ flex: 1 }}>{b}</AppText>
            </View>
          ))}
        </Card>
      </Screen>
    </PortalThemeProvider>
  );
}
