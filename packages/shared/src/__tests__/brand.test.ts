import { BRAND, PORTAL_ACCENTS, PORTAL_ACCENT_TEXT, PORTAL_ON_ACCENT, type PortalKey } from "../brand";

/** WCAG relative luminance, so contrast is asserted rather than eyeballed. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// These values live here rather than in packages/ui because the website needs
// the same ones, and packages/ui cannot be imported outside React Native. The
// alternative was retyping hex codes into CSS, which is how a brand ends up
// with two slightly different greens.
describe("BRAND", () => {
  it("carries the circuit-board palette", () => {
    expect(BRAND.color.board).toBe("#0A3B2C");
    expect(BRAND.color.silk).toBe("#EDEFE9");
    expect(BRAND.color.ink).toBe("#111A15");
    expect(BRAND.color.copper).toBe("#B4703A");
    expect(BRAND.color.gold).toBe("#C9A227");
  });

  it("exposes the 8-step spacing scale the app is built on", () => {
    expect(BRAND.space).toEqual([4, 8, 12, 16, 20, 24, 32, 48]);
  });

  // The scale is shared; how it is applied is not. React Native wants unitless
  // numbers and CSS wants rem, so the numbers travel and each platform decides
  // what to do with them.
  it("gives the type scale as plain numbers, no units", () => {
    expect(BRAND.type.display.size).toBe(34);
    expect(typeof BRAND.type.body.lineHeight).toBe("number");
  });

  // The web needs real font-family strings; the app needs the names its font
  // loader registered. Both are here so neither has to guess the other's.
  it("names the faces for both platforms", () => {
    expect(BRAND.font.display.web).toContain("IBM Plex Sans Condensed");
    expect(BRAND.font.display.native).toBe("IBMPlexSansCondensed_700Bold");
  });

  it("is frozen against mutation", () => {
    expect(Object.isFrozen(BRAND.color)).toBe(true);
  });
});

describe("portal accents", () => {
  // The organization and the business are both customers and share one brand
  // colour. The agent portal, which ran on copper as staff's own accent, was
  // retired with the agent portal itself.
  it("puts both customer portals on the board green", () => {
    expect(PORTAL_ACCENTS.org).toBe(BRAND.color.board);
    expect(PORTAL_ACCENTS.business).toBe(BRAND.color.board);
  });

  // A metal is a fill colour, not an ink: contact gold on the silkscreen
  // background is 2.8:1. The darkened twin is what gets used when an accent
  // has to be read.
  it.each(["org", "business"] as const)(
    "gives %s an accent dark enough to set text in",
    (portal: PortalKey) => {
      expect(contrast(PORTAL_ACCENT_TEXT[portal], BRAND.color.silk)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(PORTAL_ACCENT_TEXT[portal], "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    },
  );

  // Getting this wrong is not cosmetic: the dark ink the gold accent wanted
  // reads at 1.4:1 on green, which is a button whose label has vanished.
  it.each(["org", "business"] as const)(
    "makes %s's label legible on its own accent",
    (portal: PortalKey) => {
      expect(contrast(PORTAL_ON_ACCENT[portal], PORTAL_ACCENTS[portal])).toBeGreaterThanOrEqual(4.5);
    },
  );
});
