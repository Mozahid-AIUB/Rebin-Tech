import { useContext } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import { tokens } from "../tokens";
import { PortalThemeContext } from "../theme";

type Variant = keyof typeof tokens.type;
type Tone = "default" | "secondary" | "muted" | "accent" | "onPrimary";

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
  const accent = portalTheme?.accent ?? tokens.color.primary;
  const colors: Record<Tone, string> = {
    default: tokens.color.text,
    secondary: tokens.color.textSecondary,
    muted: tokens.color.muted,
    accent,
    onPrimary: tokens.color.onPrimary,
  };
  return <Text {...rest} style={[tokens.type[variant] as TextStyle, { color: colors[tone] }, style]} />;
}
