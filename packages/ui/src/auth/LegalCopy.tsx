import { AppText } from "../atoms/AppText";
import { authTokens, FONT } from "../tokens";

export function LegalCopy({
  prefix,
  onPrivacy,
  onTerms,
}: {
  prefix: string;
  onPrivacy: () => void;
  onTerms: () => void;
}) {
  // Fine print, styled as fine print: no underlines (three underlined runs in
  // one centered 13px paragraph is the busiest block on an otherwise calm
  // screen) and dropped to 11px/muted so it sits below the real footer link in
  // the hierarchy instead of competing with it.
  const link = { color: authTokens.muted, fontFamily: FONT.semibold, fontSize: 11 };
  return (
    <AppText
      variant="bodySm"
      style={{ color: authTokens.muted, opacity: 0.72, fontSize: 11, lineHeight: 17, textAlign: "center" }}
    >
      {`${prefix} `}
      <AppText style={link} onPress={onPrivacy} accessibilityRole="link">Privacy Policy</AppText>
      {" and "}
      <AppText style={link} onPress={onTerms} accessibilityRole="link">Terms of Service</AppText>
    </AppText>
  );
}
