import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  PORTAL_ACCENTS,
  PORTAL_ACCENTS_SUBTLE,
  PORTAL_ACCENT_TEXT,
  PORTAL_ON_ACCENT,
  tokens,
  type PortalKey,
} from "./tokens";

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

/**
 * The agent's theme, corrected after a phone showed it.
 *
 * The first attempt used solder-mask green for the background and a slightly
 * lighter green for cards. On a screen it read as one flat green wall: five
 * percent of lightness between a card and what is behind it is not separation,
 * and a shadow does nothing on a dark surface. Everything blurred together.
 *
 * This keeps the green -- the cast is what stops it being a generic near-black
 * dark mode -- but takes the saturation out of the base and puts real distance
 * between the levels. Copper stays the only chroma on screen, which is what
 * makes a price or a button findable at a glance in a dark van.
 */
const DARK: Scheme = {
  bg: "#0D1512",
  surface: "#18221D",
  surfaceAlt: "#131C18",
  text: "#F2F6F2",
  textSecondary: "#B7C7BE",
  muted: "#809388",
  border: "#26322C",
  divider: "#1E2823",
};

type PortalTheme = {
  portal: PortalKey;
  /** The metal itself. Fills, borders, indicators -- anything but type. */
  accent: string;
  accentSubtle: string;
  /** The metal, darkened until it can be read. See PORTAL_ACCENT_TEXT. */
  accentText: string;
  /** Text that sits on the accent -- see PORTAL_ON_ACCENT for why it varies. */
  onAccent: string;
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
  // Every portal runs light.
  //
  // The agent's ran on board green for a while, on the argument that a driver
  // works outdoors before dawn and a pale screen glares under a sodium lamp.
  // That argument still holds for a night mode; it did not hold for making one
  // portal look like a different product from the two it shares a company
  // with. Copper is what marks this portal now, which is enough.
  //
  // The DARK scheme below stays defined and contrast-checked, so a night mode
  // is a switch rather than a rebuild.
  const dark = false;

  const value = useMemo<PortalTheme>(
    () => ({
      portal,
      accent: PORTAL_ACCENTS[portal],
      accentSubtle: PORTAL_ACCENTS_SUBTLE[portal],
      accentText: PORTAL_ACCENT_TEXT[portal],
      onAccent: PORTAL_ON_ACCENT[portal],
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

/**
 * Which portal is showing, and what it looks like -- safe outside a provider.
 *
 * Screen uses this rather than taking props, so a screen cannot be dressed as
 * the wrong portal by forgetting one. The fallback is the org's, which is what
 * the handful of pre-auth screens built on Screen were already rendering.
 */
export function usePortalSurface(): { portal: PortalKey; dark: boolean; scheme: Scheme } {
  const ctx = useContext(PortalThemeContext);
  return {
    portal: ctx?.portal ?? "org",
    dark: ctx?.dark ?? false,
    scheme: ctx?.scheme ?? LIGHT,
  };
}

/** On a board-dark screen, copper reads better than the portal's own accent. */
export function useAccentOn(dark: boolean, accent: string): string {
  return dark ? tokens.color.copper : accent;
}
