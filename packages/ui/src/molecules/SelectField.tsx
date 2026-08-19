import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

export type SelectOption = { value: string; label: string };

export function SelectField({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select…",
  error,
}: {
  label: string;
  value: string | null;
  options: readonly SelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { accent } = usePortalTheme();
  const selectedLabel = options.find((o) => o.value === value)?.label ?? null;

  return (
    <View style={{ gap: tokens.space[1] }}>
      <AppText variant="label" tone="muted">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selectedLabel ?? placeholder }}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 52, justifyContent: "center",
          paddingHorizontal: tokens.space[3],
          borderRadius: tokens.radius.input,
          borderWidth: 1,
          borderColor: error ? tokens.color.danger : tokens.color.border,
          backgroundColor: tokens.color.surface,
        }}
      >
        <AppText tone={selectedLabel ? "default" : "muted"}>{selectedLabel ?? placeholder}</AppText>
      </Pressable>
      {error ? <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{error}</AppText> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(22,36,28,0.35)" }} onPress={() => setOpen(false)} />
        <View
          style={{
            maxHeight: "60%",
            backgroundColor: tokens.color.surface,
            borderTopLeftRadius: tokens.radius.sheet,
            borderTopRightRadius: tokens.radius.sheet,
            padding: tokens.space[4],
            // Anchored to the bottom of the window, which on Android sits
            // under the navigation bar -- without this the last option in the
            // list is the one a gesture bar covers.
            paddingBottom: tokens.space[4] + insets.bottom,
          }}
        >
          <AppText variant="h2" style={{ marginBottom: tokens.space[2] }}>{label}</AppText>
          <ScrollView>
            {options.map((opt) => (
              <Pressable
                key={opt.value}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                onPress={() => { onSelect(opt.value); setOpen(false); }}
                style={{
                  minHeight: 52, justifyContent: "center",
                  borderBottomWidth: 1, borderBottomColor: tokens.color.divider,
                }}
              >
                <AppText tone={opt.value === value ? "accent" : "default"}>
                  {opt.value === value ? `✓ ${opt.label}` : opt.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
