import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { authTokens } from "../tokens";
import { AppleMark, GoogleMark } from "./BrandMarks";

const LABELS = { google: "Continue with Google", apple: "Continue with Apple" } as const;

export function SocialButton({
  provider,
  onPress,
  loading = false,
}: {
  provider: keyof typeof LABELS;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={LABELS[provider]}
      accessibilityState={{ busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: authTokens.border,
        backgroundColor: "transparent",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {loading ? <ActivityIndicator color={authTokens.text} /> : (
        <View>{provider === "google" ? <GoogleMark size={20} /> : <AppleMark size={20} />}</View>
      )}
      <AppText variant="h3" style={{ color: authTokens.text, fontWeight: "500" }}>
        {LABELS[provider]}
      </AppText>
    </Pressable>
  );
}
