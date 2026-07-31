import { View } from "react-native";
import { AppText, authTokens } from "@rebin/ui";

// Feature-local re-theme of packages/ui/src/molecules/Stepper.tsx (Task 6) —
// same segmented progress bar + accessibility label format
// `Step ${current} of ${total}: ${currentLabel}` (matched character-for-
// character, since org-signup.test.tsx's getByLabelText("Step 1 of 3:
// Organization") depends on it) — restyled with authTokens instead of the
// cream tokens/portal accent. Not added to packages/ui.
export function DarkStepper({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: readonly string[];
}) {
  const currentLabel = labels[current - 1] ?? "";
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}: ${currentLabel}`}
      style={{ gap: 6 }}
    >
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i < current ? authTokens.primary : authTokens.border,
            }}
          />
        ))}
      </View>
      <AppText variant="label" style={{ color: authTokens.muted }}>
        {`Step ${current} of ${total} · ${currentLabel}`}
      </AppText>
    </View>
  );
}
