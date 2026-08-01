import { ActivityIndicator, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "../atoms/AppText";
import { authTokens } from "../tokens";

export function AuthButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const inert = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 56,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        // Pressed swaps to a genuinely darker fill instead of dimming opacity:
        // a translucent button over the gradient backdrop lets the background
        // bleed through and reads as "disabled", not "pressed".
        backgroundColor: pressed && !inert ? authTokens.primaryPressed : authTokens.primary,
        opacity: inert ? 0.5 : 1,
        // A colored glow (not a grey drop shadow) -- on a dark screen a black
        // shadow is invisible, so the lift has to come from the CTA's own hue.
        shadowColor: authTokens.primary,
        shadowOpacity: inert ? 0 : pressed ? 0.18 : 0.38,
        shadowRadius: pressed ? 8 : 16,
        shadowOffset: { width: 0, height: pressed ? 2 : 8 },
        elevation: inert ? 0 : pressed ? 2 : 6,
        transform: [{ scale: pressed && !inert ? 0.985 : 1 }],
      })}
    >
      {loading ? (
        <ActivityIndicator color={authTokens.onPrimary} />
      ) : (
        <AppText variant="h3" style={{ color: authTokens.onPrimary, letterSpacing: 0.1 }}>{label}</AppText>
      )}
    </Pressable>
  );
}
