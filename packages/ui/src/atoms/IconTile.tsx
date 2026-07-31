import { View, type ViewProps } from "react-native";
import { tokens } from "../tokens";
import { usePortalTheme } from "../theme";

export function IconTile({
  size = 48,
  tone = "accent",
  style,
  ...rest
}: ViewProps & { size?: 48 | 56; tone?: "accent" | "neutral" }) {
  const { accentSubtle } = usePortalTheme();
  return (
    <View
      {...rest}
      style={[
        {
          width: size,
          height: size,
          borderRadius: tokens.radius.button,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tone === "accent" ? accentSubtle : tokens.color.surfaceAlt,
        },
        style,
      ]}
    />
  );
}
