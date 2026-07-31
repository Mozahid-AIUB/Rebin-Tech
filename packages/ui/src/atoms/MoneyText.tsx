import { formatCents } from "@rebin/shared";
import { AppText } from "./AppText";
import { tokens } from "../tokens";

export function MoneyText({
  cents,
  size = "body",
  tone = "default",
}: {
  cents: number;
  size?: "body" | "h1" | "display";
  tone?: "default" | "accent" | "muted";
}) {
  return (
    <AppText
      variant={size}
      tone={tone}
      accessibilityLabel={formatCents(cents)}
      style={{ fontVariant: ["tabular-nums"] as const, letterSpacing: size === "body" ? 0 : tokens.type[size].letterSpacing }}
    >
      {formatCents(cents)}
    </AppText>
  );
}
