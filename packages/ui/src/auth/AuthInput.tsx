import { useState, type ReactNode } from "react";
import { Pressable, TextInput, View, type KeyboardTypeOptions } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { AppText } from "../atoms/AppText";
import { authTokens, FONT } from "../tokens";

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
    <View style={{ gap: 7 }}>
      {/* Persistent label above the field. Placeholder-only inputs lose all
          context the moment the user types -- and the placeholder is also the
          only thing distinguishing two identically-shaped fields at a glance. */}
      <AppText variant="bodySm" style={{ color: focused ? authTokens.link : authTokens.muted, fontFamily: FONT.medium }}>
        {label}
      </AppText>
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
            borderRadius: 16,
            // 1 -> 1.5px on focus, plus a lift to the pressed surface: a color
            // -only focus change is easy to miss on a dark background, and is
            // invisible to anyone who can't separate these two greens.
            borderWidth: focused || error ? 1.5 : 1,
            borderColor: error ? "#E08B84" : focused ? authTokens.primary : authTokens.border,
            backgroundColor: focused ? authTokens.surfacePressed : authTokens.surface,
            color: authTokens.text,
            fontFamily: FONT.regular,
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
            {/* Drawn, not emoji: 🙈/👁 render at a different size, weight and
                even color on every platform, and read as a sticker next to a
                set of line icons. */}
            <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
              <Path
                d="M1.8 10S4.7 4.8 10 4.8 18.2 10 18.2 10 15.3 15.2 10 15.2 1.8 10 1.8 10Z"
                stroke={authTokens.muted}
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <Circle cx="10" cy="10" r="2.4" stroke={authTokens.muted} strokeWidth="1.4" />
              {revealed ? (
                <Path d="M4 16 L16 4" stroke={authTokens.muted} strokeWidth="1.4" strokeLinecap="round" />
              ) : null}
            </Svg>
          </Pressable>
        ) : null}
      </View>
      {error ? <AppText variant="bodySm" style={{ color: "#E08B84" }}>{error}</AppText> : null}
    </View>
  );
}
