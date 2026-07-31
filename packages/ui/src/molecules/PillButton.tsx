import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText } from "../atoms/AppText";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function PillButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const { accent } = usePortalTheme();
  const inert = disabled || loading;

  const bg: Record<Variant, string> = {
    primary: accent,
    secondary: tokens.color.surfaceAlt,
    ghost: "transparent",
    danger: tokens.color.danger,
  };
  const fg: Record<Variant, "onPrimary" | "default" | "accent"> = {
    primary: "onPrimary",
    secondary: "default",
    ghost: "accent",
    danger: "onPrimary",
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        width: fullWidth ? "100%" : undefined,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: tokens.space[1],
        paddingHorizontal: tokens.space[5],
        borderRadius: tokens.radius.button,
        backgroundColor: bg[variant],
        borderWidth: variant === "ghost" ? 1 : 0,
        borderColor: accent,
        opacity: inert ? 0.5 : pressed ? 0.88 : 1,
      })}
    >
      {loading ? <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#FFF" : accent} /> : null}
      <View>
        <AppText variant="h3" tone={fg[variant]}>{label}</AppText>
      </View>
    </Pressable>
  );
}
