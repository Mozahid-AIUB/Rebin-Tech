import { Pressable, View } from "react-native";
import { AppText, tokens, usePortalTheme } from "@rebin/ui";

/**
 * Nudges a scanned count up or down.
 *
 * Two big targets rather than a text field: this is used one-handed, standing
 * in front of the thing being counted, and a keyboard covering the list you
 * are checking against defeats the purpose. Corrections here are also small --
 * "there are two more behind that one" -- so tapping beats typing.
 *
 * The labels name the item because a row of anonymous plus and minus buttons
 * is unusable with a screen reader, and there is one pair per line.
 */
export function Stepper({
  label,
  quantity,
  onChange,
}: {
  label: string;
  quantity: number;
  onChange: (by: 1 | -1) => void;
}) {
  const { accentText } = usePortalTheme();
  const atFloor = quantity <= 1;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[2] }}>
      <Button
        label={`One fewer ${label}`}
        glyph="−"
        disabled={atFloor}
        color={accentText}
        onPress={() => onChange(-1)}
      />
      <AppText variant="body" style={{ minWidth: 24, textAlign: "center" }}>
        {String(quantity)}
      </AppText>
      <Button label={`One more ${label}`} glyph="+" color={accentText} onPress={() => onChange(1)} />
    </View>
  );
}

function Button({
  label,
  glyph,
  color,
  disabled = false,
  onPress,
}: {
  label: string;
  glyph: string;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: tokens.color.border,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <AppText variant="h3" style={{ color }}>{glyph}</AppText>
    </Pressable>
  );
}
