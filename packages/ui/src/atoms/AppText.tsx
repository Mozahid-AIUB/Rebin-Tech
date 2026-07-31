import { Text, type TextProps, type TextStyle } from "react-native";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

type Variant = keyof typeof tokens.type;
type Tone = "default" | "secondary" | "muted" | "accent" | "onPrimary";

export function AppText({
  variant = "body",
  tone = "default",
  style,
  ...rest
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const { accent } = usePortalTheme();
  const colors: Record<Tone, string> = {
    default: tokens.color.text,
    secondary: tokens.color.textSecondary,
    muted: tokens.color.muted,
    accent,
    onPrimary: tokens.color.onPrimary,
  };
  return <Text {...rest} style={[tokens.type[variant] as TextStyle, { color: colors[tone] }, style]} />;
}
