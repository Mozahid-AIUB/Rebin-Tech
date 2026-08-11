import { Pressable, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

export type ChipChoice = { value: string; label: string };

/**
 * A row of chips where exactly one is chosen -- a filter bar, not a set of
 * tags.
 *
 * Separate from ChipMultiSelect rather than a flag on it because the
 * difference is not cosmetic: these announce as radios, tapping the active
 * chip cannot clear it, and the caller gets a value instead of an array it
 * has to reduce back down to one.
 */
export function ChipSingleSelect({
  options,
  value,
  onChange,
}: {
  options: readonly ChipChoice[];
  value: string;
  onChange: (next: string) => void;
}) {
  const { accent, accentSubtle } = usePortalTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space[1] }}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            style={{
              minHeight: 44,
              justifyContent: "center",
              paddingHorizontal: tokens.space[3],
              borderRadius: tokens.radius.chip,
              borderWidth: 1,
              borderColor: selected ? accent : tokens.color.border,
              backgroundColor: selected ? accentSubtle : tokens.color.surface,
            }}
          >
            <AppText variant="bodySm" tone={selected ? "accent" : "default"}>{opt.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
