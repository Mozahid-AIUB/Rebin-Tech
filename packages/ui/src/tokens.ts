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
    display: { fontSize: 32, fontWeight: "700", letterSpacing: -0.6 },
    h1: { fontSize: 26, fontWeight: "700", letterSpacing: -0.3 },
    h2: { fontSize: 20, fontWeight: "600" },
    h3: { fontSize: 17, fontWeight: "600" },
    body: { fontSize: 15, fontWeight: "400", lineHeight: 22 },
    bodySm: { fontSize: 13, fontWeight: "400", lineHeight: 19 },
    label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.9, textTransform: "uppercase" },
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
  onPrimary: "#0A2E27",
  text: "#FFFFFF",
  muted: "#A8C4BB",
  link: "#8FE07E",
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
