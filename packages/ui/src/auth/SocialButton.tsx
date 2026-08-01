import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { authTokens, FONT } from "../tokens";
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
      // Outlined on the forest surface rather than solid white. These are
      // secondary paths: two full-bleed white blocks were the highest-contrast
      // elements on the screen, pulling the eye past the primary "Log In" CTA.
      // Same height and radius keeps them a matched set, one tier quieter.
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: authTokens.border,
        backgroundColor: pressed ? authTokens.surfacePressed : authTokens.surface,
      })}
    >
      {loading ? <ActivityIndicator color={authTokens.text} /> : (
        <View>{provider === "google" ? <GoogleMark size={18} /> : <AppleMark size={18} />}</View>
      )}
      <AppText variant="body" style={{ color: authTokens.text, fontFamily: FONT.medium }}>
        {LABELS[provider]}
      </AppText>
    </Pressable>
  );
}
