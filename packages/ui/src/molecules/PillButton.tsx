import { ActivityIndicator, View } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme, useScheme } from "../theme";
import { PressableScale } from "../motion";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "quietDanger";

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
  /**
   * A stable name for the control, when the visible label changes with state.
   *
   * "Log Out" becoming "Signing out…" mid-press is right for a person looking
   * at it and wrong for anyone driving the screen by name -- a screen reader
   * user, or a test -- because the button they reached for stops existing
   * halfway through the action.
   */
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: "impact" | "success" | "none";
  accessibilityLabel?: string;
}) {
  const { accent, accentText, onAccent } = usePortalTheme();
  const scheme = useScheme();
  const inert = disabled || loading;

  const bg: Record<Variant, string> = {
    primary: accent,
    secondary: scheme.surfaceAlt,
    ghost: "transparent",
    danger: tokens.color.danger,
    // Outlined rather than filled. A filled red bar is what you use for
    // something that destroys data; signing out destroys nothing, you simply
    // sign back in. But it is still the one control on the screen with a
    // consequence, so the label keeps the red and the shape stays quiet.
    quietDanger: "transparent",
  };
  // The label's colour is resolved rather than toned, because "text on the
  // accent" is not one colour across three portals -- see PORTAL_ON_ACCENT.
  const fg: Record<Variant, string> = {
    primary: onAccent,
    secondary: scheme.text,
    // A ghost button is a label on the page background, so it is set in the
    // ink metal rather than the fill one -- the same reason accent type is.
    ghost: accentText,
    danger: "#FFFFFF",
    quietDanger: tokens.color.danger,
  };

  function fire() {
    if (haptic === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (haptic === "impact") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
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
        borderWidth: variant === "ghost" || variant === "quietDanger" ? 1 : 0,
        // A ghost button's outline should read as a boundary, not as a second
        // primary button competing with the real one above it.
        borderColor: variant === "ghost" || variant === "quietDanger" ? scheme.border : accent,
        opacity: inert ? 0.4 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : null}
      <View>
        {/* Slight positive tracking: a button label is read at a glance rather
            than in a sentence, and letters set a touch apart hold their shape
            at that speed. Left at the body face's default it looked cramped
            inside a wide pill. */}
        <AppText variant="h3" style={{ color: fg[variant], letterSpacing: 0.2 }}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}
