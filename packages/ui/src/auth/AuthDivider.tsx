import { View } from "react-native";
import { AppText } from "../atoms/AppText";
import { authTokens } from "../tokens";

export function AuthDivider({ label = "or" }: { label?: string }) {
  const line = { flex: 1, height: 1, backgroundColor: authTokens.border };
  return (
    <View accessibilityElementsHidden style={{ flexDirection: "row", alignItems: "center", gap: 14, marginVertical: 6 }}>
      <View style={line} />
      <AppText variant="label" style={{ color: authTokens.muted, fontSize: 10 }}>{label}</AppText>
      <View style={line} />
    </View>
  );
}
