import { useContext } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import { tokens } from "../tokens";
import { PortalThemeContext } from "../theme";

type Variant = keyof typeof tokens.type;
type Tone = "default" | "secondary" | "muted" | "accent" | "copper" | "onPrimary";

export function AppText({
  variant = "body",
  tone = "default",
  style,
  ...rest
}: TextProps & { variant?: Variant; tone?: Tone }) {
  // NOTE: reads PortalThemeContext directly (not the throwing usePortalTheme()
  // hook) so AppText can render outside a PortalThemeProvider — needed by the
  // Task 15 dark-forest auth primitives (AuthScreen/AuthButton/AuthInput/
  // SocialButton/AuthDivider/LegalCopy), which are portal-agnostic pre-auth
  // screens and never wrap in a PortalThemeProvider. Falls back to the base
  // brand green (tokens.color.primary) for tone="accent" when there is no
  // provider; every existing portal-scoped consumer still renders inside a
  // PortalThemeProvider in its own tests and gets the real accent color
  // unchanged. usePortalTheme() itself still throws for direct callers, so
  // theme.test.tsx's "throws outside a provider" case is unaffected.
  const portalTheme = useContext(PortalThemeContext);
  const scheme = portalTheme?.scheme;
  // On board green the portal's own accent (that same green, for the org)
  // would vanish, so a dark screen accents in copper.
  const accent = portalTheme?.dark
    ? tokens.color.copper
    : portalTheme?.accent ?? tokens.color.primary;
  const colors: Record<Tone, string> = {
    default: scheme?.text ?? tokens.color.text,
    secondary: scheme?.textSecondary ?? tokens.color.textSecondary,
    muted: scheme?.muted ?? tokens.color.muted,
    accent,
    // The trace metal. Used for the data layer's own marks, which belong to
    // the board rather than to whichever portal is showing them.
    copper: tokens.color.copper,
    onPrimary: tokens.color.onPrimary,
  };
  return <Text {...rest} style={[tokens.type[variant] as TextStyle, { color: colors[tone] }, style]} />;
}
