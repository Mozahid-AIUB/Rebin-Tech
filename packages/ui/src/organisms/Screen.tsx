import type { ReactNode } from "react";
import { Platform, ScrollView, View } from "react-native";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import {
  KeyboardAwareScrollView,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "../tokens";

/**
 * Every screen's frame: the scroll area, the floating footer, and the status
 * bar's colour.
 *
 * The footer is the app's one piece of glass. Content genuinely passes beneath
 * it, which is the only condition under which translucency means anything --
 * cards do not get it, because there is nothing behind a card but flat
 * background and blurring that is ornament.
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
  // The tab bar floats (PortalTabs positions it absolutely), which means it
  // occupies no layout space and a footer pinned to bottom: 0 lands underneath
  // it. This is the clearance.
  const barHeight = (dark ? tokens.layout.tabBarDark : tokens.layout.tabBar) + insets.bottom;

  // Drives the footer up with the keyboard rather than leaving it buried.
  // `height` is negative while the keyboard is open, and it tracks the real
  // system animation, so the footer arrives with the keyboard rather than
  // snapping after it.
  const keyboard = useReanimatedKeyboardAnimation();
  const footerStyle = useAnimatedStyle(() => ({
    // Below the keyboard's own height the tab bar is hidden behind it anyway,
    // so the footer only needs to clear whichever is taller.
    bottom: Math.max(barHeight, -keyboard.height.value),
  }));

  const body = (
    <View
      style={{
        padding: tokens.space[4],
        gap: tokens.space[4],
        // Clearance so the last row is never trapped under the footer glass.
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
          opposite treatments. Left unset, Android draws them light, which is
          invisible on silkscreen. */}
      <StatusBar style={dark ? "light" : "dark"} />

      {scroll ? (
        // KeyboardAwareScrollView, not a plain one: a form whose lower fields
        // disappear behind the keyboard is the most common way a mobile app
        // feels unfinished, and every screen with inputs is built on this
        // frame. bottomOffset keeps the focused field clear of the footer as
        // well as the keyboard -- scrolling it to just above the keyboard, and
        // under the Continue button, would be its own trap.
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          bottomOffset={footer ? 120 : tokens.space[6]}
        >
          {body}
        </KeyboardAwareScrollView>
      ) : (
        body
      )}

      {footer ? (
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              ...tokens.elevation.floating,
            },
            footerStyle,
          ]}
        >
          <BlurView
            intensity={Platform.OS === "android" ? 40 : 60}
            tint={dark ? "dark" : "light"}
            style={{
              paddingHorizontal: tokens.space[4],
              paddingTop: tokens.space[3],
              // The safe area belongs to the tab bar below, not to this.
              paddingBottom: tokens.space[3],
              // Blur alone leaves text hard to read over a busy list, so the
              // glass sits on a wash of the background rather than on nothing.
              backgroundColor: dark ? "rgba(6,41,30,0.72)" : "rgba(237,239,233,0.72)",
              borderTopWidth: 1,
              borderTopColor: dark ? "rgba(180,112,58,0.22)" : "rgba(10,59,44,0.08)",
            }}
          >
            {footer}
          </BlurView>
        </Animated.View>
      ) : null}
    </View>
  );
}
