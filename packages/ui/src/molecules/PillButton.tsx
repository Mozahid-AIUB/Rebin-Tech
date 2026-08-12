import { ActivityIndicator, View } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";
import { PressableScale } from "../motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";

/**
 * The app's one button.
 *
 * Two things beyond colour make it feel expensive rather than cheap, and
 * neither is visible in a screenshot:
 *
 *   - It springs under the finger, so a tap is answered in under a frame
 *     whatever the request behind it is doing.
 *   - It buzzes. For a field agent in gloves, in a warehouse where the phone
 *     cannot be heard, that is confirmation rather than decoration.
 */
export function PillButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = true,
  /** Overrides the default feel. `success` for a completed job or an accepted
   *  offer -- the moments worth marking. */
  haptic = "impact",
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: "impact" | "success" | "none";
}) {
  const { accent } = usePortalTheme();
  const inert = disabled || loading;

  const bg: Record<Variant, string> = {
    primary: accent,
    secondary: tokens.color.surfaceAlt,
    ghost: "transparent",
    danger: tokens.color.danger,
  };
  const fg: Record<Variant, "onPrimary" | "default" | "accent"> = {
    primary: "onPrimary",
    secondary: "default",
    ghost: "accent",
    danger: "onPrimary",
  };

  function fire() {
    if (haptic === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (haptic === "impact") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={fire}
      style={{
        minHeight: 52,
        width: fullWidth ? "100%" : undefined,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: tokens.space[1],
        paddingHorizontal: tokens.space[5],
        borderRadius: tokens.radius.button,
        backgroundColor: bg[variant],
        borderWidth: variant === "ghost" ? 1 : 0,
        borderColor: accent,
        opacity: inert ? 0.45 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#FFF" : accent} />
      ) : null}
      <View>
        <AppText variant="h3" tone={fg[variant]}>{label}</AppText>
      </View>
    </PressableScale>
  );
}
