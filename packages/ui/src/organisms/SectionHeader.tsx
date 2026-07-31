import { View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";

export function SectionHeader({
  index,
  title,
  subtitle,
}: {
  index?: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 2 }} accessibilityRole="header">
      <AppText variant="h2">{index ? `${index}. ${title}` : title}</AppText>
      {subtitle ? <AppText variant="bodySm" tone="muted">{subtitle}</AppText> : null}
    </View>
  );
}
