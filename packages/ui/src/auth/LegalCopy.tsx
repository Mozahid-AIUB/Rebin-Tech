import { AppText } from "../atoms/AppText";
import { authTokens } from "../tokens";

export function LegalCopy({
  prefix,
  onPrivacy,
  onTerms,
}: {
  prefix: string;
  onPrivacy: () => void;
  onTerms: () => void;
}) {
  const link = { color: authTokens.link, textDecorationLine: "underline" as const };
  return (
    <AppText variant="bodySm" style={{ color: authTokens.muted, lineHeight: 19 }}>
      {`${prefix} `}
      <AppText variant="bodySm" style={link} onPress={onPrivacy} accessibilityRole="link">Privacy Policy</AppText>
      {" and "}
      <AppText variant="bodySm" style={link} onPress={onTerms} accessibilityRole="link">Terms of Service</AppText>
    </AppText>
  );
}
