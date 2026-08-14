/**
 * Registered family names for the app typefaces.
 *
 * Three roles, deliberately (see docs/design-direction.md §2):
 *   display — IBM Plex Sans Condensed Bold, for headings
 *   body    — IBM Plex Sans, for sentences
 *   data    — IBM Plex Mono, for serials, ids, money and counts
 *
 * The mono is not a mood. Every board this app collects already carries
 * condensed monospace on its silkscreen -- reference designators, part
 * numbers, revision marks -- and the serials the app captures are read off
 * exactly that printing. Setting them in mono is setting them in the lettering
 * they came from.
 *
 * The strings must match the export names of the @expo-google-fonts packages
 * exactly: React Native resolves a loaded font by that registered name, and a
 * typo silently falls back to the system face rather than erroring.
 */
export const FONT = Object.freeze({
  display: "IBMPlexSansCondensed_700Bold",
  regular: "IBMPlexSans_400Regular",
  medium: "IBMPlexSans_500Medium",
  semibold: "IBMPlexSans_600SemiBold",
  mono: "IBMPlexMono_500Medium",
  monoBold: "IBMPlexMono_600SemiBold",
});

/**
 * The palette is a circuit board.
 *
 * Not a metaphor: a board is the object at the centre of every pickup and
 * every quote this app handles, and it already carries a complete palette --
 * solder mask, trace copper, contact gold, silkscreen white. It also arrives
 * at a green nobody picks for a recycling app by default, because it is solder
 * mask rather than sustainability.
 */
export const tokens = {
  color: Object.freeze({
    // Surfaces
    bg: "#EDEFE9",          // silkscreen, off a stripped board
    surface: "#FFFFFF",
    surfaceAlt: "#E4E8E0",
    surfaceWarm: "#F6F0E4",
    board: "#0A3B2C",       // solder mask -- dark surfaces, agent theme
    boardDeep: "#06291E",
    border: "#D9DDD4",
    divider: "#E2E5DC",

    // Type. Near-black with the board's green in it, never neutral grey.
    text: "#111A15",
    textSecondary: "#3D4B43",
    muted: "#727E76",
    onPrimary: "#FFFFFF",

    // The board's own metals.
    primary: "#0A3B2C",     // org: the board itself
    primaryDark: "#06291E",
    primaryLight: "#DCE6DF",
    primarySubtle: "#E9EFEA",
    copper: "#B4703A",      // trace: the metal being recovered
    copperSubtle: "#F3E7DC",
    gold: "#C9A227",        // edge connector: money
    goldSubtle: "#F7EFD5",

    success: "#1F6B47",
    warning: "#D08A1E",     // rosin flux
    danger: "#B3423A",
    info: "#2F6076",
  }),

  space: Object.freeze([4, 8, 12, 16, 20, 24, 32, 48] as const),

  // 16 on cards, 0 on the docket alone -- a printed docket is square because
  // paper is, not because square is the style. Dropping every radius to zero
  // is how a design slides into the broadsheet look.
  radius: Object.freeze({ card: 16, button: 12, chip: 8, input: 10, sheet: 24, docket: 0 }),

  /**
   * Three levels, so a booking CTA and a read-only address block stop having
   * identical weight.
   */
  elevation: Object.freeze({
    flat: {},
    raised: {
      shadowColor: "#0A3B2C",
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    floating: {
      shadowColor: "#0A3B2C",
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: -4 },
      elevation: 12,
    },
  }),

  type: Object.freeze({
    // fontWeight is deliberately NOT set alongside fontFamily: with static
    // (non-variable) fonts the weight is baked into the family name, and
    // passing both makes Android synthesize a faux-bold over an already-bold
    // face.
    //
    // Condensed buys width, so display runs larger than it did at the same
    // measure.
    display: { fontFamily: FONT.display, fontSize: 34, letterSpacing: -0.4, lineHeight: 38 },
    h1: { fontFamily: FONT.display, fontSize: 27, letterSpacing: -0.3, lineHeight: 32 },
    h2: { fontFamily: FONT.semibold, fontSize: 20, letterSpacing: -0.2, lineHeight: 26 },
    h3: { fontFamily: FONT.semibold, fontSize: 17, letterSpacing: -0.1, lineHeight: 22 },
    body: { fontFamily: FONT.regular, fontSize: 15, lineHeight: 22 },
    bodySm: { fontFamily: FONT.regular, fontSize: 13, lineHeight: 19 },
    label: { fontFamily: FONT.semibold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },

    /** Serials, asset tags, ids. The lettering on the object itself. */
    data: { fontFamily: FONT.mono, fontSize: 13, letterSpacing: 0.2, lineHeight: 18 },
    /** Money and counts that sit in a column. */
    figure: { fontFamily: FONT.monoBold, fontSize: 17, letterSpacing: -0.2, lineHeight: 22 },
    /** A total, or a stat tile's value. */
    figureLg: { fontFamily: FONT.monoBold, fontSize: 26, letterSpacing: -0.6, lineHeight: 30 },
  }),

  /**
   * The tab bar floats, so its height is not layout space -- anything else
   * pinned to the bottom of a screen has to clear it deliberately.
   *
   * The agent's bar is taller because that portal is worked one-handed and
   * often gloved.
   */
  // Per portal, because the tab bar floats: it occupies no layout space, so
  // every screen reserves its height by hand and the two numbers have to be
  // the same one. The agent's is taller -- that portal is worked one-handed,
  // often gloved, standing at the back of a van.
  layout: Object.freeze({
    tabBar: Object.freeze({ org: 62, business: 62, agent: 70 }),
  }),

  /** Motion. Durations stay short: a field agent taps and moves. */
  motion: Object.freeze({
    instant: 120,
    quick: 200,
    settle: 320,
    count: 500,
    /** Between staggered siblings. */
    stagger: 60,
    spring: { damping: 18, stiffness: 180, mass: 0.9 },
    pressSpring: { damping: 22, stiffness: 400, mass: 0.6 },
  }),
} as const;

/** Dark forest palette — pre-auth screens only (Welcome, Sign Up, Sign In). */
export const authTokens = Object.freeze({
  bg: "#0A3B2C",
  bgDeep: "#06291E",
  surface: "#12503C",
  surfacePressed: "#175A44",
  border: "#1D6349",
  primary: "#D9A05B",
  primaryPressed: "#C48F4E",
  onPrimary: "#06291E",
  text: "#FFFFFF",
  muted: "#9DB8AB",
  link: "#E0B778",
});

/**
 * Per-role accents for the dark auth backdrop.
 *
 * PORTAL_ACCENTS below are tuned for the light in-app theme and go muddy on
 * the board green -- the org's own accent is that green, so on the auth
 * backdrop it would vanish entirely. These are the same three materials lifted
 * into a range that stays legible on a dark board.
 */
export const AUTH_ROLE_ACCENTS = Object.freeze({
  org: "#6FD39B",
  business: "#E6C25C",
  agent: "#D9915B",
});

/**
 * Two customer portals in one brand colour, and the driver's in another.
 *
 * The business portal ran on contact gold for a while, on the argument that
 * three portals are three products and each should look like its own -- a
 * hospital handing over boards, a shop being paid for them, a driver
 * recovering the metal. Changed at the client's direction: the organization
 * and the business are both *customers*, and a customer who deals with Rebin
 * in both capacities should not feel handed between two companies.
 *
 * The agent keeps copper. That portal is staff, not customers, and the
 * difference is worth showing.
 */
export const PORTAL_ACCENTS = Object.freeze({
  org: "#0A3B2C",
  // Solder-mask green, the same value as the org's rather than a near-miss.
  // Two greens a few percent apart read as a mistake; one green reads as a
  // brand.
  business: "#0A3B2C",
  // Brighter than the trace copper it comes from, so it holds its own against
  // the silkscreen background instead of sinking into it.
  agent: "#C8823F",
});

/**
 * The same three accents, darkened until they can be read as text.
 *
 * A metal is a fill colour. Contact gold on the silkscreen background is
 * 2.8:1 and the agent's copper 2.7:1 -- fine behind a button label, nowhere
 * near enough for a label set *in* it, which is what "AGREED PRICE" above a
 * figure actually is. Rather than give those labels up to plain ink and lose
 * the portal's colour where it does the most work, each metal has a deepened
 * version that clears 4.5:1 and still reads as gold or copper rather than
 * brown.
 *
 * The org's solder-mask green is already dark enough, so it is unchanged --
 * the pair exists so call sites need not care which portal they are in.
 */
export const PORTAL_ACCENT_TEXT = Object.freeze({
  org: "#0A3B2C",
  // The board green is already 10.8:1 on the silkscreen background, so unlike
  // the metals it needs no darkened twin -- the fill colour is the ink colour.
  business: "#0A3B2C",
  agent: "#8A5228",
});

/**
 * What colour text sits on a portal's accent.
 *
 * White on copper is roughly 4:1 and white on contact gold barely 3:1 -- both
 * fail for anything smaller than a heading, and both read muddy rather than
 * rich. Dark text on a metal reads the way an engraved plate does, and clears
 * 5:1. Only the org's solder-mask green is dark enough to want white.
 */
export const PORTAL_ON_ACCENT = Object.freeze({
  org: "#FFFFFF",
  // Follows the accent, not the portal. The near-black this was while the
  // business ran on gold reads at 1.4:1 against green -- a button whose label
  // has disappeared. White clears 12.5:1.
  business: "#FFFFFF",
  agent: "#1C1109",
});

export const PORTAL_ACCENTS_SUBTLE = Object.freeze({
  org: "#E9EFEA",
  // The gold tint would have left icon tiles and selected chips warm on a
  // portal whose accent is now cool -- the one place the old colour would
  // have survived unnoticed.
  business: "#E9EFEA",
  agent: "#F3E7DC",
});

export type PortalKey = keyof typeof PORTAL_ACCENTS;
