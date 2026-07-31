import { formatWeight } from "@rebin/shared";
import { AppText } from "./AppText";

export function WeightText({ grams, tone = "default" }: { grams: number; tone?: "default" | "muted" }) {
  const label = formatWeight(grams);
  return (
    <AppText tone={tone} accessibilityLabel={label} style={{ fontVariant: ["tabular-nums"] as const }}>
      {label}
    </AppText>
  );
}
