import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { portalForRole } from "@rebin/api";
import { AUTH_ROLE_ACCENTS, AppText, AuthScreen, authTokens, type PortalKey } from "@rebin/ui";
import { PORTAL_CONTENT } from "../../src/config/portals";
import { useSessionStore } from "../../src/store/session";
import { useLogout } from "../../src/hooks/useLogout";

// See login.tsx's own `asHref` for the identical reasoning: known,
// hand-authored route names, never unvalidated user input. None of the three
// portal home routes have screens yet, so Expo Router's codegen'd types don't
// know them.
function asHref(path: string): Href {
  return path as Href;
}

const HOME: Record<PortalKey, string> = {
  org: "/(org)/dashboard",
  business: "/(biz)/dashboard",
  agent: "/(agent)/dispatch",
};

const ROLE_LABEL: Record<string, string> = {
  org_owner: "Owner", org_admin: "Admin", org_requester: "Requester",
  biz_owner: "Owner", biz_staff: "Staff",
  field_agent: "Field Agent", field_lead: "Field Lead",
};

// Same dark-forest deviation from the plan's cream `Screen` as pending.tsx:
// this runs after authentication but before the user has entered any portal,
// so there is no portal theme to adopt yet -- picking one would tint the
// screen for a choice the user hasn't made.
export default function ContextPicker() {
  const router = useRouter();
  const { assignments, setActiveIndex } = useSessionStore();
  const { logout, pending } = useLogout();

  return (
    <AuthScreen
      title="Choose an account"
      subtitle="You have access to more than one Rebin Tech account."
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log Out"
          accessibilityState={{ busy: pending }}
          onPress={() => void logout()}
          style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
        >
          <AppText variant="h3" style={{ color: authTokens.text }}>Log Out</AppText>
        </Pressable>
      }
    >
      <View style={{ gap: 10 }}>
        {assignments.map((assignment, index) => {
          const portal = portalForRole(assignment.role);
          // Platform roles have no mobile portal. Rendering an un-tappable row
          // for one would offer a choice that goes nowhere.
          if (!portal) return null;

          const accent = AUTH_ROLE_ACCENTS[portal === "business" ? "business" : portal];
          const name = assignment.scopeName ?? PORTAL_CONTENT[portal].title;

          return (
            <Pressable
              key={`${assignment.role}-${assignment.scopeId ?? "self"}`}
              accessibilityRole="button"
              accessibilityLabel={`${name}, ${ROLE_LABEL[assignment.role] ?? assignment.role}`}
              onPress={() => {
                // Order matters: the store must know which assignment is
                // active before RoleGuard on the destination reads it, or the
                // guard bounces the user straight back out.
                setActiveIndex(index);
                router.replace(asHref(HOME[portal]));
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                padding: 16,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: pressed ? accent : authTokens.border,
                backgroundColor: pressed ? authTokens.surfacePressed : authTokens.surface,
              })}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  backgroundColor: `${accent}2E`,
                }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="h3" style={{ color: authTokens.text }}>{name}</AppText>
                <AppText variant="bodySm" style={{ color: accent }}>
                  {ROLE_LABEL[assignment.role] ?? assignment.role}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </AuthScreen>
  );
}
