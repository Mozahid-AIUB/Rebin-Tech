import { View, type ViewProps } from "react-native";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

const BACKGROUNDS = {
  default: tokens.color.surface,
  alt: tokens.color.surfaceAlt,
  warm: tokens.color.surfaceWarm,
} as const;

export function Card({
  variant = "default",
  accentBorder = false,
  style,
  ...rest
}: ViewProps & { variant?: keyof typeof BACKGROUNDS; accentBorder?: boolean }) {
  const { accent } = usePortalTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: BACKGROUNDS[variant],
          borderRadius: tokens.radius.card,
          borderWidth: 1,
          borderColor: accentBorder ? accent : tokens.color.border,
          padding: tokens.space[4],
        },
        style,
      ]}
    />
  );
}
