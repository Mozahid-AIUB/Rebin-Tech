/**
 * The brand, in values both platforms can read.
 *
 * `packages/ui/src/tokens.ts` used to be the only home for this, and it cannot
 * leave React Native: its `elevation` is `shadowOffset`/`shadowRadius` rather
 * than `box-shadow`, its `lineHeight` is a unitless number, and its font
 * families are the names `@expo-google-fonts` registers rather than anything a
 * browser has heard of. Importing it from a Next.js app would drag in
 * `react-native`, `expo-blur` and the rest of that tree.
 *
 * So the platform-neutral half lives here: colour, spacing, radius, and the
 * type *scale* as bare numbers. Each platform applies them its own way —
 * `packages/ui` re-exports these so nothing in the app changed, and the website
 * maps the same numbers to CSS. The alternative was retyping hex codes into a
 * stylesheet, which is how a brand ends up with two greens a few percent apart
 * and nobody able to say which is right.
 *
 * What stays in `tokens.ts`: anything shaped like a React Native style object.
 */

/**
 * The palette is a circuit board.
 *
 * Not a metaphor: a board is the object at the centre of every pickup and every
 * quote, and it already carries a complete palette — solder mask, trace copper,
 * contact gold, silkscreen white. It also arrives at a green nobody picks for a
 * recycling app by default, because it is solder mask rather than
 * sustainability. See docs/design-direction.md §1.
 */
const color = Object.freeze({
  board: "#0A3B2C",
  boardDeep: "#06291E",
  silk: "#EDEFE9",
  surface: "#FFFFFF",
  surfaceAlt: "#E4E8E0",
  surfaceWarm: "#F6F0E4",
  ink: "#111A15",
  inkSecondary: "#3D4B43",
  muted: "#727E76",
  border: "#D9DDD4",
  divider: "#E2E5DC",
  copper: "#B4703A",
  copperSubtle: "#F3E7DC",
  gold: "#C9A227",
  goldSubtle: "#F7EFD5",
  success: "#1F6B47",
  warning: "#D08A1E",
  danger: "#B3423A",
  info: "#2F6076",
});

/**
 * Both names for each face.
 *
 * `native` is what the font loader registered — React Native resolves a face by
 * that exact string and a typo falls back to the system font silently. `web` is
 * a CSS font stack. Keeping the pair together means neither platform has to
 * guess what the other calls the same typeface.
 */
const font = Object.freeze({
  display: Object.freeze({
    native: "IBMPlexSansCondensed_700Bold",
    web: "'IBM Plex Sans Condensed', 'Helvetica Neue', Arial, sans-serif",
  }),
  body: Object.freeze({
    native: "IBMPlexSans_400Regular",
    web: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
  }),
  mono: Object.freeze({
    native: "IBMPlexMono_500Medium",
    web: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  }),
});

/**
 * The type scale as bare numbers.
 *
 * Sizes are pixels at the app's base scale. The web divides by 16 for rem; React
 * Native uses them directly. `lineHeight` is a pixel figure for the same reason
 * — a unitless CSS line-height and a React Native one mean different things, so
 * neither convention is baked in here.
 */
const type = Object.freeze({
  display: Object.freeze({ size: 34, lineHeight: 38, tracking: -0.4 }),
  h1: Object.freeze({ size: 27, lineHeight: 32, tracking: -0.3 }),
  h2: Object.freeze({ size: 20, lineHeight: 26, tracking: -0.2 }),
  h3: Object.freeze({ size: 17, lineHeight: 22, tracking: -0.1 }),
  body: Object.freeze({ size: 15, lineHeight: 22, tracking: 0 }),
  bodySm: Object.freeze({ size: 13, lineHeight: 19, tracking: 0 }),
  label: Object.freeze({ size: 11, lineHeight: 14, tracking: 1 }),
});

export const BRAND = Object.freeze({
  color,
  font,
  type,
  space: Object.freeze([4, 8, 12, 16, 20, 24, 32, 48] as const),
  // 16 on cards, 0 on the docket alone -- a printed docket is square because
  // paper is, not because square is a style. Dropping every radius to zero is
  // how a design slides into the broadsheet look.
  radius: Object.freeze({ card: 16, button: 12, chip: 8, input: 10, sheet: 24, docket: 0 }),
});

/**
 * Two customer portals in one brand colour, and the driver's in another.
 *
 * The business portal ran on contact gold for a while, on the argument that
 * three portals are three products. Changed at the client's direction: the
 * organization and the business are both *customers*, and a customer dealing
 * with Rebin in both capacities should not feel handed between two companies.
 * The agent keeps copper because that portal is staff, and the difference is
 * worth showing.
 */
export const PORTAL_ACCENTS = Object.freeze({
  org: color.board,
  business: color.board,
  // Brighter than the trace copper it comes from, so it holds its own against
  // the silkscreen background instead of sinking into it.
  agent: "#C8823F",
});

/**
 * The same accents, deepened until they can be read as text.
 *
 * A metal is a fill colour. Contact gold on the silkscreen background is 2.8:1
 * and the agent's copper 2.7:1 — fine behind a button label, illegible as one.
 * The board green is already 10.8:1, so the customer portals need no twin: for
 * them the fill colour is the ink colour.
 */
export const PORTAL_ACCENT_TEXT = Object.freeze({
  org: color.board,
  business: color.board,
  agent: "#8A5228",
});

/**
 * What colour text sits on a portal's accent.
 *
 * Follows the accent, not the portal. The near-black this was while the
 * business ran on gold reads at 1.4:1 against green — a button whose label has
 * disappeared.
 */
export const PORTAL_ON_ACCENT = Object.freeze({
  org: "#FFFFFF",
  business: "#FFFFFF",
  agent: "#1C1109",
});

export const PORTAL_ACCENTS_SUBTLE = Object.freeze({
  org: "#E9EFEA",
  business: "#E9EFEA",
  agent: "#F3E7DC",
});

/**
 * Which portal a screen belongs to.
 *
 * Defined here rather than in packages/ui because packages/api needs it to type
 * `portalForRole`, and importing a type from the UI package made every consumer
 * of the API package install the whole Expo tree.
 */
export type PortalKey = keyof typeof PORTAL_ACCENTS;

/**
 * Where a supplier ships their collection.
 *
 * Lives here rather than inline in a screen because the console needs the same
 * string in a later stage, and a constant duplicated into two apps is one that
 * drifts the first time either changes.
 *
 * `null` until the real address is in hand — accounts go active on signup
 * with no approval step in between, so there is no gate that would stop an
 * unset address from being shown to a supplier the moment they sign up. A
 * screen that reads this must treat `null` as "not ready to ship" rather than
 * printing a fake address: see `WAREHOUSE_ADDRESS_PENDING_NOTE` below. Set
 * this to the real string and every screen that reads it starts showing it,
 * with no other edit required.
 */
export const WAREHOUSE_ADDRESS: string | null = null;

/**
 * What a ship-to card says while `WAREHOUSE_ADDRESS` is still `null`.
 *
 * Shipping e-waste to an address that doesn't exist is worse than telling a
 * supplier to wait, so this is the fallback every render site must use
 * instead of the address itself.
 */
export const WAREHOUSE_ADDRESS_PENDING_NOTE =
  "We're confirming your warehouse address — we'll be in touch before you need to ship anything.";
