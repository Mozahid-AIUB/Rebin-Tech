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
        borderRadius: 14,
        backgroundColor: authTokens.primary,
        opacity: inert ? 0.55 : pressed ? 0.9 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={authTokens.onPrimary} />
      ) : (
        <AppText variant="h3" style={{ color: authTokens.onPrimary }}>{label}</AppText>
      )}
    </Pressable>
  );
}
