import type { ComponentType } from "react";
import type { ColorValue } from "react-native";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
 *
 * It is also the second of the app's two pieces of glass. A tab bar has a
 * scrolling list beneath it, which is the only condition under which
 * translucency means anything -- see Screen for the other one.
 */
export function PortalTabs({
  portal,
  tabs,
  hidden = [],
}: {
  portal: PortalKey;
  tabs: readonly PortalTab[];
  /**
   * Routes that live in the portal's folder but must not get a tab button --
   * `<Tabs>` discovers every route file in its group, so a pushed screen like
   * the booking wizard shows up in the bar until it is declared with
   * `href: null`.
   */
  hidden?: readonly string[];
}) {
  const accent = PORTAL_ACCENTS[portal];
  // The agent portal runs on board green, so its chrome does too.
  const dark = portal === "agent";
  // The bar is absolutely positioned so the list scrolls under its glass,
  // which also means React Navigation stops insetting it for us: on a phone
  // with gesture navigation it lands underneath the system bar and the labels
  // are cut in half. This is that inset, put back by hand.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: dark ? tokens.color.copper : accent,
        tabBarInactiveTintColor: dark ? "#809388" : tokens.color.muted,
        // No ripple. Android draws a dark circle that spills past the icon and
        // reads as a smudge rather than as feedback -- the tint change on the
        // icon and label already says which tab was hit.
        tabBarButton: ({ children, onPress, accessibilityState, testID }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={accessibilityState}
            testID={testID}
            onPress={onPress}
            android_ripple={null}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            {children}
          </Pressable>
        ),
        tabBarStyle: {
          position: "absolute",
          // Opaque, unlike the footer above it. The footer's glass sits over a
          // list that is meant to be seen moving; a tab bar is navigation, and
          // a label competing with whatever scrolls behind it is a label you
          // cannot read.
          backgroundColor: dark ? "#18221D" : tokens.color.surface,
          borderTopColor: dark ? "#26322C" : tokens.color.divider,
          borderTopWidth: 1,
          // Field agents work one-handed, often gloved: their bar is taller
          // and its targets bigger.
          height: (dark ? tokens.layout.tabBarDark : tokens.layout.tabBar) + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + (dark ? 12 : 8),
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
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
