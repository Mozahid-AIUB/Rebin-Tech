import { View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";

/**
 * One number and what it means, sized for a row of three or four.
 *
 * The value is the loud part and the label the quiet one, because a glance at
 * this row should answer "how much" before "of what" -- the reverse reads as a
 * form.
 */
export function StatTile({
  value,
  label,
  tone = "default",
}: {
  value: string;
  label: string;
  tone?: "default" | "accent" | "muted";
}) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flex: 1,
        gap: 2,
        paddingVertical: tokens.space[3],
        paddingHorizontal: tokens.space[2],
        borderRadius: tokens.radius.card,
        borderWidth: 1,
        borderColor: tokens.color.border,
        backgroundColor: tokens.color.surface,
        alignItems: "center",
      }}
    >
      <AppText variant="h2" tone={tone === "muted" ? "muted" : tone}>{value}</AppText>
      <AppText variant="label" tone="muted" style={{ textAlign: "center" }}>{label}</AppText>
    </View>
  );
}

/** A row of stat tiles that share the width evenly. */
export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: tokens.space[1] }}>{children}</View>
  );
}
