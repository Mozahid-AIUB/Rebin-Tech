import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { authTokens, tokens } from "../tokens";
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
  theme = "dark",
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
  /**
   * "light" fades the dark-forest gradient to white toward the bottom of the
   * screen instead of holding solid green -- built for the signup role
   * picker, whose card list (price/payout bullet points) an App Store
   * reviewer misread as a paid-tier picker under 3.1.1. Every other pre-auth
   * screen omits this and keeps the original dark treatment unchanged.
   */
  theme?: "dark" | "light";
}) {
  const insets = useSafeAreaInsets();
  const isLight = theme === "light";
  const c = isLight
    // textSecondary, not the lighter `muted` token: the subtitle sits right
    // where the gradient below is still fading through mid-tone green, and
    // muted's gray reads at near-equal contrast against both that and pure
    // white -- exactly the range where it disappears.
    ? { text: tokens.color.text, muted: tokens.color.textSecondary, border: tokens.color.border, pressedBg: tokens.color.surfaceAlt }
    : { text: authTokens.text, muted: authTokens.muted, border: authTokens.border, pressedBg: authTokens.surfacePressed };
  return (
    <View style={{ flex: 1, backgroundColor: isLight ? "#FFFFFF" : authTokens.bg }}>
      <LinearGradient
        colors={isLight ? [authTokens.bg, "#FFFFFF"] : [authTokens.bg, authTokens.bgDeep]}
        // The light variant's green band is a thin strip behind the back
        // button/logo only -- held past the title/subtitle the fade's
        // mid-tone green was exactly where text contrast was worst (this
        // was too tall a fade before and made the subtitle unreadable).
        locations={isLight ? [0, 0.13] : undefined}
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
                borderColor: c.border,
                backgroundColor: pressed ? c.pressedBg : "transparent",
                // Optically aligns the glyph with the 24px screen gutter --
                // a 44px tap target padded to the gutter would push the arrow
                // visibly inboard of the title below it.
                marginLeft: -10,
              })}
            >
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Path
                  d="M12 4 L6 10 L12 16"
                  stroke={c.text}
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
          <AppText variant="display" style={{ color: c.text, marginTop: onBack ? 14 : 20 }}>{title}</AppText>
          {subtitle ? (
            <AppText variant="body" style={{ color: c.muted, marginTop: 6 }}>{subtitle}</AppText>
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
