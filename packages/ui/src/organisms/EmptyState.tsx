import { View } from "react-native";
import { AppText } from "../atoms/AppText";
import { PillButton } from "../molecules/PillButton";
import { tokens } from "../tokens";

export function EmptyState({
  title,
  body,
  ctaLabel,
  onCtaPress,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}) {
  return (
    <View style={{ alignItems: "center", gap: tokens.space[2], paddingVertical: tokens.space[7] }}>
      <AppText variant="h3">{title}</AppText>
      <AppText variant="body" tone="muted" style={{ textAlign: "center" }}>{body}</AppText>
      {ctaLabel && onCtaPress ? (
        <View style={{ marginTop: tokens.space[2], alignSelf: "stretch" }}>
          <PillButton label={ctaLabel} onPress={onCtaPress} />
        </View>
      ) : null}
    </View>
  );
}
