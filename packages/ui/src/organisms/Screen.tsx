import type { ReactNode } from "react";
import { Platform, ScrollView, View } from "react-native";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "../tokens";

/**
 * Every screen's frame, and the app's one piece of glass.
 *
 * The footer floats over a scrolling list, so content genuinely passes beneath
 * it -- which is the only condition under which translucency means anything.
 * Cards do not get it: there is nothing behind a card but flat background, so
 * blurring one is ornament, and ornament is what reads as cheap.
 *
 * Falls back to an opaque surface where blur is unavailable, which includes
 * the low-end Android a field agent carries.
 */
export function Screen({
  children,
  footer,
  scroll = true,
  /** Board-dark, for the agent portal. */
  dark = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  dark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const bg = dark ? tokens.color.board : tokens.color.bg;
  // The tab bar floats (PortalTabs sets position: absolute so the list scrolls
  // under its glass), which means it occupies no layout space and a footer
  // pinned to bottom: 0 lands underneath it. This is the clearance.
  const barHeight = (dark ? tokens.layout.tabBarDark : tokens.layout.tabBar) + insets.bottom;

  const body = (
    <View
      style={{
        padding: tokens.space[4],
        gap: tokens.space[4],
        // Enough clearance that the last row is never trapped under the glass.
        paddingBottom: footer ? tokens.space[7] * 2 + barHeight : tokens.space[7] + barHeight,
      }}
    >
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      {/* Set per screen rather than once at the root: the agent portal is
          board-dark and the other two are not, so the clock and battery need
          opposite treatments. Without this Android leaves them light, which
          is invisible on silkscreen. */}
      <StatusBar style={dark ? "light" : "dark"} />
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}

      {footer ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: barHeight,
            ...tokens.elevation.floating,
          }}
        >
          <BlurView
            intensity={Platform.OS === "android" ? 40 : 60}
            tint={dark ? "dark" : "light"}
            style={{
              paddingHorizontal: tokens.space[4],
              paddingTop: tokens.space[3],
              // The safe area belongs to the tab bar below, not to this.
              paddingBottom: tokens.space[3],
              // Blur alone leaves text on a busy list hard to read, so the
              // glass sits on a wash of the background rather than on nothing.
              backgroundColor: dark ? "rgba(6,41,30,0.72)" : "rgba(237,239,233,0.72)",
              borderTopWidth: 1,
              borderTopColor: dark ? "rgba(180,112,58,0.22)" : "rgba(10,59,44,0.08)",
            }}
          >
            {footer}
          </BlurView>
        </View>
      ) : null}
    </View>
  );
}
