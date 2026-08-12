import { View, type ViewProps } from "react-native";
import { tokens } from "../tokens";
import { usePortalTheme, useScheme } from "../theme";

const BACKGROUNDS = {
  default: "surface",
  alt: "surfaceAlt",
  warm: "warm",
  /** Flat: data, not an object. No fill, no border, no shadow -- rows are
   *  separated by space, because rules everywhere is how a design slides into
   *  the broadsheet look. */
  flat: "transparent",
} as const;

export function Card({
  variant = "default",
  accentBorder = false,
  style,
  ...rest
}: ViewProps & { variant?: keyof typeof BACKGROUNDS; accentBorder?: boolean }) {
  const { accent } = usePortalTheme();
  const scheme = useScheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor:
            variant === "flat"
              ? "transparent"
              : variant === "warm"
                ? tokens.color.surfaceWarm
                : variant === "alt"
                  ? scheme.surfaceAlt
                  : scheme.surface,
          borderRadius: variant === "flat" ? 0 : tokens.radius.card,
          // A border only when it means something. An accent border marks the
          // one card on a screen that is the point of it; everything else
          // gets separation from elevation, which reads as depth rather than
          // as a drawn box.
          borderWidth: accentBorder ? 1.5 : 0,
          borderColor: accent,
          padding: variant === "flat" ? 0 : tokens.space[4],
        },
        variant === "flat" ? tokens.elevation.flat : tokens.elevation.raised,
        style,
      ]}
    />
  );
}
