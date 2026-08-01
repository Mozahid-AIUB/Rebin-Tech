import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { authTokens } from "../tokens";
import { AppText } from "../atoms/AppText";
import { BotanicalBackdrop } from "./BotanicalBackdrop";
import { RebinMark } from "./RebinMark";

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  onBack,
  backLabel = "Go back",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Renders a back control in place of the brand mark. Screens deeper than
   * the entry point (e.g. signup steps) pass this; the entry screens don't,
   * so the mark keeps its role as the flow's visual anchor. */
  onBack?: () => void;
  backLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: authTokens.bg }}>
      <LinearGradient
        colors={[authTokens.bg, authTokens.bgDeep]}
        style={{ position: "absolute", inset: 0 }}
      />
      <BotanicalBackdrop />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{
          flexGrow: 1,
          // Centered rather than top-anchored: on tall phones the form used
          // to cling to the status bar with a big empty gap underneath. With
          // flexGrow the centering only kicks in when the content is shorter
          // than the viewport -- once it overflows (small screens, keyboard
          // open, error rows visible) it falls back to normal top-down scroll
          // and the paddings below still hold.
          justifyContent: "center",
          // Screens with a back control already have a 44px element holding
          // the top of the page open, so they need far less breathing room
          // above it -- keeping the entry screens' generous padding here just
          // pushed a long form's content off the first screenful.
          paddingTop: insets.top + (onBack ? 16 : 40),
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(320)} style={{ marginBottom: 8 }}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              onPress={onBack}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: authTokens.border,
                backgroundColor: pressed ? authTokens.surfacePressed : "transparent",
                // Optically aligns the glyph with the 24px screen gutter --
                // a 44px tap target padded to the gutter would push the arrow
                // visibly inboard of the title below it.
                marginLeft: -10,
              })}
            >
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Path
                  d="M12 4 L6 10 L12 16"
                  stroke={authTokens.text}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          ) : (
            <RebinMark />
          )}
          {/* Tighter under a back arrow than under the brand mark: the arrow
              is a control the title follows, not a logo it needs clearance
              from. */}
          <AppText variant="display" style={{ color: authTokens.text, marginTop: onBack ? 14 : 20 }}>{title}</AppText>
          {subtitle ? (
            <AppText variant="body" style={{ color: authTokens.muted, marginTop: 6 }}>{subtitle}</AppText>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320).delay(60)} style={{ gap: 12 }}>
          {children}
        </Animated.View>

        {footer ? (
          <Animated.View entering={FadeInDown.duration(320).delay(120)} style={{ marginTop: "auto", gap: 12 }}>
            {footer}
          </Animated.View>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}
