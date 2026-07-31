import { Switch, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const { accent } = usePortalTheme();
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: tokens.space[3],
        padding: tokens.space[4], borderRadius: tokens.radius.card,
        borderWidth: 1, borderColor: tokens.color.border, backgroundColor: tokens.color.surface,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="h3">{label}</AppText>
        {description ? <AppText variant="bodySm" tone="muted">{description}</AppText> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: accent, false: tokens.color.border }}
      />
    </View>
  );
}
