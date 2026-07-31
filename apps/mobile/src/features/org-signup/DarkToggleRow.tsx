import { Switch, View } from "react-native";
import { AppText, authTokens } from "@rebin/ui";

// Feature-local re-theme of packages/ui/src/molecules/ToggleRow.tsx (Task 6)
// — same label + description + Switch structure — restyled with authTokens
// instead of cream tokens/portal accent, since Task 15 never built a
// dark-forest ToggleRow and the cream one calls the throwing usePortalTheme()
// hook (crashes outside a PortalThemeProvider, which this screen deliberately
// never wraps in — see organization.tsx). Not added to packages/ui.
export function DarkToggleRow({
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
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: authTokens.border,
        backgroundColor: authTokens.surface,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="h3" style={{ color: authTokens.text }}>{label}</AppText>
        {description ? <AppText variant="bodySm" style={{ color: authTokens.muted }}>{description}</AppText> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: authTokens.primary, false: authTokens.border }}
      />
    </View>
  );
}
