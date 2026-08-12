import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { Enter, useCountUp } from "../motion";
import { useScheme } from "../theme";

/**
 * One number and what it means.
 *
 * The value is set in mono, because these are counts and sums read off records
 * — and mono keeps a column of them aligned, which a proportional face cannot.
 *
 * When the value is numeric it counts up on arrival. A figure that climbs
 * registers; one that is simply present does not.
 */
export function StatTile({
  value,
  label,
  tone = "default",
  /** Position in the row, for the stagger. */
  index = 0,
  /** Prefixed to the counted number, e.g. "$". */
  prefix = "",
}: {
  value: string | number;
  label: string;
  tone?: "default" | "accent" | "muted" | "copper";
  index?: number;
  prefix?: string;
}) {
  const scheme = useScheme();
  const numeric = typeof value === "number";
  const counted = useCountUp(numeric ? value : 0, numeric);
  const shown = numeric ? `${prefix}${counted.toLocaleString("en-US")}` : String(value);

  return (
    <Enter index={index} style={{ flex: 1 }}>
      <View
        accessibilityRole="text"
        accessibilityLabel={`${label}: ${numeric ? `${prefix}${value}` : value}`}
        style={{
          flex: 1,
          gap: 3,
          paddingVertical: tokens.space[3],
          paddingHorizontal: tokens.space[2],
          borderRadius: tokens.radius.card,
          backgroundColor: scheme.surface,
          alignItems: "center",
          ...tokens.elevation.raised,
        }}
      >
        <AppText variant="figureLg" tone={tone === "muted" ? "muted" : tone}>{shown}</AppText>
        <AppText variant="label" tone="muted" style={{ textAlign: "center", fontSize: 10 }}>
          {label}
        </AppText>
      </View>
    </Enter>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", gap: tokens.space[1] }}>{children}</View>;
}
