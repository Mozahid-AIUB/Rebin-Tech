import { View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

export function Stepper({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: readonly string[];
}) {
  const { accent } = usePortalTheme();
  const currentLabel = labels[current - 1] ?? "";
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}: ${currentLabel}`}
      style={{ gap: tokens.space[1] }}
    >
      <View style={{ flexDirection: "row", gap: tokens.space[0] }}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1, height: 4, borderRadius: 2,
              backgroundColor: i < current ? accent : tokens.color.border,
            }}
          />
        ))}
      </View>
      <AppText variant="label" tone="muted">{`Step ${current} of ${total} · ${currentLabel}`}</AppText>
    </View>
  );
}
