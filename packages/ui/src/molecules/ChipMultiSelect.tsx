import { Pressable, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme, useScheme } from "../theme";

export type ChipOption = { value: string; label: string };

export function ChipMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: readonly ChipOption[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
}) {
  const { accent, accentSubtle } = usePortalTheme();
  const scheme = useScheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space[1] }}>
      {options.map((opt) => {
        const isOn = selected.includes(opt.value);
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="checkbox"
            accessibilityLabel={opt.label}
            accessibilityState={{ checked: isOn }}
            onPress={() =>
              onChange(isOn ? selected.filter((v) => v !== opt.value) : [...selected, opt.value])
            }
            style={{
              minHeight: 44,
              justifyContent: "center",
              paddingHorizontal: tokens.space[3],
              borderRadius: tokens.radius.chip,
              borderWidth: 1,
              borderColor: isOn ? accent : scheme.border,
              backgroundColor: isOn ? accentSubtle : scheme.surface,
            }}
          >
            <AppText variant="bodySm" tone={isOn ? "accent" : "default"}>
              {isOn ? `✓ ${opt.label}` : opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
