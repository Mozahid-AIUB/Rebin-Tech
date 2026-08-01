/** Registered family names for the app typeface (see tokens.type below). */
export const FONT = Object.freeze({
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
});

export const tokens = {
  color: Object.freeze({
    bg: "#F6F4ED",
    surface: "#FFFFFF",
    surfaceAlt: "#EFF3EC",
    surfaceWarm: "#FBF1E8",
    border: "#E4E1D7",
    divider: "#EDEAE1",

    text: "#16241C",
    textSecondary: "#46564C",
    muted: "#7A867E",
    onPrimary: "#FFFFFF",

    primary: "#2E6B4F",
    primaryDark: "#1F4D38",
    primaryLight: "#E6F1E9",
    primarySubtle: "#F2F7F3",

    success: "#2E7D4F",
    warning: "#C08A2E",
    danger: "#C0453B",
    info: "#3E6B8A",
  }),
  space: Object.freeze([4, 8, 12, 16, 20, 24, 32, 48] as const),
  radius: Object.freeze({ card: 20, button: 14, chip: 10, input: 12, sheet: 24 }),
  type: Object.freeze({
    // Plus Jakarta Sans, loaded once in apps/mobile/app/_layout.tsx. The family
    // strings must match the export names of @expo-google-fonts/plus-jakarta-sans
    // exactly -- RN resolves a loaded font by that registered name, and a typo
    // silently falls back to the system face rather than erroring.
    //
    // fontWeight is deliberately NOT set alongside fontFamily: with a static
    // (non-variable) font, the weight is baked into the family name, and
    // passing both makes Android synthesize a faux-bold on top of an already
    // -bold face. Weight now lives in the family choice alone.
    display: { fontFamily: FONT.bold, fontSize: 32, letterSpacing: -0.8, lineHeight: 38 },
    h1: { fontFamily: FONT.bold, fontSize: 26, letterSpacing: -0.5, lineHeight: 32 },
    h2: { fontFamily: FONT.semibold, fontSize: 20, letterSpacing: -0.3, lineHeight: 26 },
    h3: { fontFamily: FONT.semibold, fontSize: 17, letterSpacing: -0.2, lineHeight: 22 },
    body: { fontFamily: FONT.regular, fontSize: 15, lineHeight: 22 },
    bodySm: { fontFamily: FONT.regular, fontSize: 13, lineHeight: 19 },
    label: { fontFamily: FONT.semibold, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase" },
  }),
} as const;

/** Dark forest palette — pre-auth screens only (Welcome, Sign Up, Sign In). */
export const authTokens = Object.freeze({
  bg: "#0E3A32",
  bgDeep: "#0A2E27",
  surface: "#1D4A42",
  surfacePressed: "#245049",
  border: "#2F5B52",
  primary: "#5FC85A",
  primaryPressed: "#4EAF4A",
  onPrimary: "#0A2E27",
  text: "#FFFFFF",
  muted: "#A8C4BB",
  link: "#8FE07E",
});

/**
 * Per-role accents for the dark auth backdrop.
 *
 * PORTAL_ACCENTS below are tuned for the light in-app theme and go muddy on
 * #0E3A32 (the business gold in particular drops to roughly 2:1 against it).
 * These are the same three hues lifted into a range that stays legible on the
 * dark surface, so the role picker's three cards read as three distinct
 * choices rather than one repeated card.
 */
export const AUTH_ROLE_ACCENTS = Object.freeze({
  org: "#5FC85A",
  business: "#E8B65C",
  agent: "#4ECFC0",
});

export const PORTAL_ACCENTS = Object.freeze({
  org: "#2E6B4F",
  business: "#B8862F",
  agent: "#1F7A6B",
});

export const PORTAL_ACCENTS_SUBTLE = Object.freeze({
  org: "#E6F1E9",
  business: "#FBF1E8",
  agent: "#E3F1EE",
});

export type PortalKey = keyof typeof PORTAL_ACCENTS;
