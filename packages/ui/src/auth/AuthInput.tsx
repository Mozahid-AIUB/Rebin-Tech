import { useState, type ReactNode } from "react";
import { Pressable, TextInput, View, type KeyboardTypeOptions } from "react-native";
import { AppText } from "../atoms/AppText";
import { authTokens } from "../tokens";

export function AuthInput({
  label,
  placeholder,
  value,
  onChangeText,
  secure = false,
  error,
  keyboardType,
  autoCapitalize = "none",
  icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (next: string) => void;
  secure?: boolean;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "words";
  /** Optional leading glyph (e.g. a mail/lock icon). Purely decorative -- the
   * field's accessible name still comes from `label`, not the icon. */
  icon?: ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {icon ? (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ position: "absolute", left: 16, zIndex: 1 }}
          >
            {icon}
          </View>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={authTokens.muted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secure && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={{
            flex: 1,
            minHeight: 56,
            paddingHorizontal: 18,
            paddingLeft: icon ? 48 : 18,
            paddingRight: secure ? 52 : 18,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: error ? "#E08B84" : focused ? authTokens.primary : authTokens.border,
            backgroundColor: authTokens.surface,
            color: authTokens.text,
            fontSize: 15,
          }}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            onPress={() => setRevealed((r) => !r)}
            hitSlop={12}
            style={{ position: "absolute", right: 16, height: 44, width: 44, alignItems: "center", justifyContent: "center" }}
          >
            <AppText style={{ color: authTokens.muted, fontSize: 18 }}>{revealed ? "🙈" : "👁"}</AppText>
          </Pressable>
        ) : null}
      </View>
      {error ? <AppText variant="bodySm" style={{ color: "#E08B84" }}>{error}</AppText> : null}
    </View>
  );
}
