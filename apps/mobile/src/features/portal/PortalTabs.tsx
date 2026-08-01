import type { ComponentType } from "react";
import type { ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { PORTAL_ACCENTS, tokens, type PortalKey } from "@rebin/ui";

export type PortalTab = {
  /** Route file name inside the portal group, e.g. "dashboard". */
  name: string;
  title: string;
  Icon: ComponentType<{ color: ColorValue }>;
};

/**
 * The bottom tab bar every portal shares.
 *
 * One component rather than three near-identical `<Tabs>` blocks: the three
 * portals differ only in their accent colour and which three routes they list,
 * and a tab bar that drifts between portals is the kind of inconsistency
 * users read as sloppiness rather than as intent.
 *
 * The accent comes from PORTAL_ACCENTS (the light in-app palette) rather than
 * the portal theme context, because the tab bar renders outside the
 * PortalThemeProvider that RoleGuard sets up around the screens.
 */
export function PortalTabs({ portal, tabs }: { portal: PortalKey; tabs: readonly PortalTab[] }) {
  const accent = PORTAL_ACCENTS[portal];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: tokens.color.muted,
        tabBarStyle: {
          backgroundColor: tokens.color.surface,
          borderTopColor: tokens.color.divider,
          borderTopWidth: 1,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontFamily: tokens.type.label.fontFamily,
          fontSize: 11,
          letterSpacing: 0.2,
          // The label variant is uppercase for section headers; a tab bar reads
          // better in sentence case at this size.
          textTransform: "none",
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <tab.Icon color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
