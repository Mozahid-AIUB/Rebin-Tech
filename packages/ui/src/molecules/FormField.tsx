import { TextInput, View, type KeyboardTypeOptions, type TextInputProps } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";

type Mask = "phone" | "zip" | "currency";

const DIGITS_ONLY: Record<Mask, number> = { phone: 10, zip: 9, currency: 12 };

function applyMask(raw: string, mask?: Mask): string {
  if (!mask) return raw;
  const digits = raw.replace(/\D/g, "").slice(0, DIGITS_ONLY[mask]);
  return digits;
}

function displayMask(value: string, mask?: Mask): string {
  if (mask !== "phone" || value.length !== 10) return value;
  return `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
}

export function FormField({
  label,
  value,
  onChangeText,
  error,
  helper,
  mask,
  keyboardType,
  autoComplete,
  textContentType,
  autoCapitalize,
  secureTextEntry,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  error?: string;
  helper?: string;
  mask?: Mask;
  keyboardType?: KeyboardTypeOptions;
  /**
   * What this field is, so the phone's autofill can offer the right thing.
   *
   * Without it a password manager cannot tell a contact name from a street,
   * and the user types an address they already have saved. Passed through to
   * both platforms' own hint systems.
   */
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  secureTextEntry?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  const inferredKeyboard: KeyboardTypeOptions | undefined =
    keyboardType ?? (mask === "phone" ? "phone-pad" : mask ? "number-pad" : undefined);

  return (
    <View style={{ gap: tokens.space[1] }}>
      <AppText variant="label" tone="muted">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        value={displayMask(value, mask)}
        onChangeText={(raw) => onChangeText(applyMask(raw, mask))}
        keyboardType={inferredKeyboard}
        autoComplete={autoComplete}
        textContentType={textContentType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={tokens.color.muted}
        style={{
          minHeight: multiline ? 96 : 52,
          paddingHorizontal: tokens.space[3],
          paddingVertical: tokens.space[2],
          borderRadius: tokens.radius.input,
          borderWidth: 1,
          borderColor: error ? tokens.color.danger : tokens.color.border,
          backgroundColor: tokens.color.surface,
          color: tokens.color.text,
          fontSize: 15,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
      {error ? <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{error}</AppText> : null}
      {!error && helper ? <AppText variant="bodySm" tone="muted">{helper}</AppText> : null}
    </View>
  );
}
