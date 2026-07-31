import { Pressable, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

export function RadioTile({
  label,
  subtitle,
  selected,
  onPress,
}: {
  label: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { accent, accentSubtle } = usePortalTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${label}. ${subtitle}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 72,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: tokens.space[3],
        padding: tokens.space[4],
        borderRadius: tokens.radius.card,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? accent : tokens.color.border,
        backgroundColor: selected ? accentSubtle : tokens.color.surface,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="h3">{label}</AppText>
        <AppText variant="bodySm" tone="muted">{subtitle}</AppText>
      </View>
      <View
        style={{
          width: 22, height: 22, borderRadius: 11,
          borderWidth: 2, borderColor: selected ? accent : tokens.color.border,
          alignItems: "center", justifyContent: "center",
        }}
      >
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accent }} /> : null}
      </View>
    </Pressable>
  );
}
