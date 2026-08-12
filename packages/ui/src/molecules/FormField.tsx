import { forwardRef, useState } from "react";
import { TextInput, View, type KeyboardTypeOptions, type TextInputProps } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme, useScheme } from "../theme";

type Mask = "phone" | "zip" | "currency";

const DIGITS_ONLY: Record<Mask, number> = { phone: 10, zip: 9, currency: 12 };

function applyMask(raw: string, mask?: Mask): string {
  if (!mask) return raw;
  return raw.replace(/\D/g, "").slice(0, DIGITS_ONLY[mask]);
}

function displayMask(value: string, mask?: Mask): string {
  if (mask !== "phone" || value.length !== 10) return value;
  return `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
}

/**
 * One field.
 *
 * Three things here are what separate a form that works from one that leads:
 *
 *   - The border answers the focus. Without it nothing on screen says which
 *     field the keyboard is typing into, which is the single most common way
 *     a mobile form feels unfinished.
 *   - The return key says "next" and moves to the field after it, so a form is
 *     one continuous action rather than a sequence of taps into blank space.
 *   - The error is announced, not just drawn, so a screen reader reaches it.
 */
export const FormField = forwardRef<TextInput, {
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
   * and the user retypes an address they already have saved.
   */
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  secureTextEntry?: boolean;
  multiline?: boolean;
  placeholder?: string;
  /** Focus the next field when the return key is pressed. */
  onSubmitEditing?: () => void;
  /** "next" while more fields follow, "done" on the last one. */
  returnKeyType?: TextInputProps["returnKeyType"];
  onBlur?: () => void;
}>(function FormField(
  {
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
    onSubmitEditing,
    returnKeyType,
    onBlur,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const { accent } = usePortalTheme();
  const scheme = useScheme();

  const inferredKeyboard: KeyboardTypeOptions | undefined =
    keyboardType ?? (mask === "phone" ? "phone-pad" : mask ? "number-pad" : undefined);

  const borderColor = error
    ? tokens.color.danger
    : focused
      ? accent
      : scheme.border;

  return (
    <View style={{ gap: tokens.space[1] }}>
      {/* The label picks up the accent while focused, so the pair reads as one
          active object rather than a heading above a box. */}
      <AppText variant="label" tone={focused && !error ? "accent" : "muted"}>{label}</AppText>

      <TextInput
        ref={ref}
        accessibilityLabel={label}
        // Announces the message the moment it appears rather than leaving a
        // screen reader to find it.
        accessibilityHint={error}
        value={displayMask(value, mask)}
        onChangeText={(raw) => onChangeText(applyMask(raw, mask))}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        keyboardType={inferredKeyboard}
        autoComplete={autoComplete}
        textContentType={textContentType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={scheme.muted}
        // A multiline field keeps its return key as a newline; a single-line
        // one hands it to the next field.
        returnKeyType={multiline ? undefined : returnKeyType}
        onSubmitEditing={multiline ? undefined : onSubmitEditing}
        blurOnSubmit={!onSubmitEditing}
        selectionColor={accent}
        style={{
          minHeight: multiline ? 96 : 52,
          paddingHorizontal: tokens.space[3],
          paddingVertical: tokens.space[2],
          borderRadius: tokens.radius.input,
          // Thicker while focused: a colour change alone is easy to miss on a
          // sunlit screen, which is where half of this app is used.
          borderWidth: focused || error ? 1.5 : 1,
          borderColor,
          backgroundColor: scheme.surface,
          color: scheme.text,
          fontFamily: tokens.type.body.fontFamily,
          fontSize: 15,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />

      {error ? (
        <AppText
          variant="bodySm"
          accessibilityLiveRegion="polite"
          style={{ color: tokens.color.danger }}
        >
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="bodySm" tone="muted">{helper}</AppText>
      ) : null}
    </View>
  );
});
