import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { AppText, authTokens } from "@rebin/ui";

// Task 15 never built a dark-forest SelectField (only AuthInput/AuthButton/
// AuthScreen/SocialButton/AuthDivider/LegalCopy exist there). This is a
// one-off, feature-local re-theme of packages/ui/src/molecules/SelectField.tsx
// (Task 6) — same tap-to-open-a-modal-list interaction, same accessibility
// shape (trigger is accessibilityRole="button" + accessibilityLabel=label,
// each option is its own accessibilityRole="button" + accessibilityLabel=
// option.label, which is what the wizard test's `getByLabelText("Organization
// Type")` + `getByRole("button", { name: "Hospital / Clinic" })` depend on),
// but visually matched to AuthInput instead of the cream FormField: 56pt min
// height, 14px radius, authSurface fill, authBorder border, authText/
// authMuted text. Not added to packages/ui — scoped to this feature only.
export type DarkSelectOption = { value: string; label: string };

export function DarkSelectField({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select…",
  error,
}: {
  label: string;
  value: string | null;
  options: readonly DarkSelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? null;

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selectedLabel ?? placeholder }}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 56,
          justifyContent: "center",
          paddingHorizontal: 18,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: error ? "#E08B84" : authTokens.border,
          backgroundColor: authTokens.surface,
        }}
      >
        <AppText style={{ color: selectedLabel ? authTokens.text : authTokens.muted, fontSize: 15 }}>
          {selectedLabel ?? placeholder}
        </AppText>
      </Pressable>
      {error ? <AppText variant="bodySm" style={{ color: "#E08B84" }}>{error}</AppText> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(10,46,39,0.55)" }} onPress={() => setOpen(false)} />
        <View
          style={{
            maxHeight: "60%",
            backgroundColor: authTokens.bgDeep,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: authTokens.border,
            padding: 20,
          }}
        >
          <AppText variant="h2" style={{ color: authTokens.text, marginBottom: 12 }}>{label}</AppText>
          <ScrollView>
            {options.map((opt) => (
              <Pressable
                key={opt.value}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                onPress={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
                style={{
                  minHeight: 52,
                  justifyContent: "center",
                  borderBottomWidth: 1,
                  borderBottomColor: authTokens.border,
                }}
              >
                <AppText style={{ color: opt.value === value ? authTokens.primary : authTokens.text }}>
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
