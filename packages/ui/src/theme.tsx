import { createContext, useContext, useMemo, type ReactNode } from "react";
import { PORTAL_ACCENTS, PORTAL_ACCENTS_SUBTLE, tokens, type PortalKey } from "./tokens";

/**
 * A resolved surface palette, so a primitive never has to ask "am I on a dark
 * screen?" — it asks the theme what colour text is.
 *
 * The agent portal runs on board green rather than a neutral near-black: a
 * driver's screen at 5am should look like the unpopulated board in the back of
 * the van, not like a generic dark-mode template.
 */
type Scheme = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  muted: string;
  border: string;
  divider: string;
};

const LIGHT: Scheme = {
  bg: tokens.color.bg,
  surface: tokens.color.surface,
  surfaceAlt: tokens.color.surfaceAlt,
  text: tokens.color.text,
  textSecondary: tokens.color.textSecondary,
  muted: tokens.color.muted,
  border: tokens.color.border,
  divider: tokens.color.divider,
};

const DARK: Scheme = {
  bg: tokens.color.board,
  surface: "#0F4835",
  surfaceAlt: "#0D4130",
  text: "#F2F6F2",
  textSecondary: "#BCD2C6",
  muted: "#8FA89A",
  border: "#1B5A44",
  divider: "#16513C",
};

type PortalTheme = {
  portal: PortalKey;
  accent: string;
  accentSubtle: string;
  dark: boolean;
  scheme: Scheme;
};

export const PortalThemeContext = createContext<PortalTheme | null>(null);

export function PortalThemeProvider({
  portal,
  children,
}: {
  portal: PortalKey;
  children: ReactNode;
}) {
  // The agent portal is dark by definition rather than by a prop: it is a
  // property of who uses it, not of which screen is showing.
  const dark = portal === "agent";

  const value = useMemo<PortalTheme>(
    () => ({
      portal,
      accent: PORTAL_ACCENTS[portal],
      accentSubtle: PORTAL_ACCENTS_SUBTLE[portal],
      dark,
      scheme: dark ? DARK : LIGHT,
    }),
    [portal, dark],
  );

  return <PortalThemeContext.Provider value={value}>{children}</PortalThemeContext.Provider>;
}

export function usePortalTheme(): PortalTheme {
  const ctx = useContext(PortalThemeContext);
  if (!ctx) throw new Error("usePortalTheme must be used within a PortalThemeProvider");
  return ctx;
}

/**
 * The surface palette, safe outside a provider.
 *
 * Pre-auth screens render without one (see AppText), so this falls back to
 * light rather than throwing.
 */
export function useScheme(): Scheme {
  return useContext(PortalThemeContext)?.scheme ?? LIGHT;
}

/** On a board-dark screen, copper reads better than the portal's own accent. */
export function useAccentOn(dark: boolean, accent: string): string {
  return dark ? tokens.color.copper : accent;
}
