import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import {
  AppText,
  PORTAL_ACCENT_TEXT,
  PORTAL_ON_ACCENT,
  PortalThemeProvider,
  tokens,
  usePortalTheme,
} from "../index";

function Probe() {
  const { portal, accent } = usePortalTheme();
  return <Text testID="probe">{`${portal}:${accent}`}</Text>;
}

/** WCAG relative luminance, so contrast can be asserted rather than eyeballed. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("tokens", () => {
  // The palette is taken from a circuit board rather than an eco mood board
  // (docs/design-direction.md §1): silkscreen off-white, solder-mask green,
  // trace copper, contact gold. Pinned because the direction names these exact
  // values, and drifting off them is how a considered palette becomes a
  // roughly-green one.
  it("uses silkscreen off-white for the background, not cream", () => {
    expect(tokens.color.bg).toBe("#EDEFE9");
  });
  it("uses solder-mask green as the primary", () => {
    expect(tokens.color.primary).toBe("#0A3B2C");
  });
  it("keeps the board's own metals", () => {
    expect(tokens.color.copper).toBe("#B4703A");
    expect(tokens.color.gold).toBe("#C9A227");
  });

  // White on copper is roughly 4:1 and on contact gold barely 3:1 -- both fail
  // for anything smaller than a heading. Dark text on a metal clears 5:1 and
  // reads like an engraved plate rather than a muddy one.
  it("puts dark text on the metals and white on the board green", () => {
    expect(PORTAL_ON_ACCENT.org).toBe("#FFFFFF");
    // The business portal runs on that same green now, so it takes white too.
    // Getting this wrong is not cosmetic: the dark ink gold wanted reads at
    // 1.4:1 on green, which is a button whose label has vanished.
    expect(PORTAL_ON_ACCENT.business).toBe("#FFFFFF");
    expect(PORTAL_ON_ACCENT.agent).not.toBe("#FFFFFF");
  });
  // A metal is a fill colour, not an ink. Contact gold on the silkscreen
  // background is 2.8:1 and the agent's copper 2.7:1 -- a label set in either
  // is decoration that happens to contain words. The darkened metals are what
  // gets used when an accent has to be *read*.
  it.each(["org", "business", "agent"] as const)(
    "gives %s an accent dark enough to set text in",
    (portal) => {
      expect(contrast(PORTAL_ACCENT_TEXT[portal], tokens.color.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(PORTAL_ACCENT_TEXT[portal], tokens.color.surface)).toBeGreaterThanOrEqual(4.5);
    },
  );

  // The point is a legible version of the same metal, not a fallback to ink.
  it("keeps the text accents distinct from the body colour", () => {
    expect(PORTAL_ACCENT_TEXT.business).not.toBe(tokens.color.text);
    expect(PORTAL_ACCENT_TEXT.agent).not.toBe(tokens.color.text);
  });

  it("exposes an 8-step spacing scale", () => {
    expect(tokens.space).toEqual([4, 8, 12, 16, 20, 24, 32, 48]);
  });
  it("is frozen against mutation", () => {
    expect(Object.isFrozen(tokens.color)).toBe(true);
  });
});

describe("PortalThemeProvider", () => {
  it.each([
    // Solder mask, contact gold, trace copper -- the accents follow the object
    // rather than rotating a hue wheel.
    ["org", "#0A3B2C"],
    // Solder-mask green, same as the org's. Contact gold was the vendor's
    // accent until the client asked for one brand colour across the customer
    // portals -- see the note on PORTAL_ACCENTS.
    ["business", "#0A3B2C"],
    // Brighter than the trace copper it comes from: an accent on a dark screen
    // has to carry its own luminance.
    ["agent", "#C8823F"],
  ] as const)("provides the %s accent", async (portal, accent) => {
    // NOTE: deviation from the brief's literal test body — `render` is awaited
    // here. @testing-library/react-native@14.0.1 (installed; see package.json
    // deviation note) made `render()` async internally via `act()`, so the
    // `screen` singleton is only populated once the returned promise resolves.
    // Without awaiting, `screen.getByTestId` hits the un-populated placeholder
    // and throws "`render` function has not been called". Same root cause and
    // fix as apps/mobile/__tests__/boot.test.tsx (see task-1-report.md).
    await render(
      <PortalThemeProvider portal={portal}>
        <Probe />
      </PortalThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(`${portal}:${accent}`);
  });

  // Every portal is light now, including the agent's. The dark scheme is kept
  // for a future night mode but nothing selects it, so no screen should be
  // resolving its text against a dark surface.
  it.each(["org", "business", "agent"] as const)("renders %s on the light scheme", async (portal) => {
    function SchemeProbe() {
      const { dark, scheme } = usePortalTheme();
      return <Text testID="probe">{`${dark}:${scheme.bg}`}</Text>;
    }
    await render(
      <PortalThemeProvider portal={portal}>
        <SchemeProbe />
      </PortalThemeProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent(`false:${tokens.color.bg}`);
  });

  // The distinction the accent colours draw: a button is filled with the metal,
  // a label is set in the darkened one. Asking for accent *text* has to give
  // the readable version or the contrast work above buys nothing.
  it.each(["business", "agent"] as const)("sets %s accent text in the readable metal", async (portal) => {
    await render(
      <PortalThemeProvider portal={portal}>
        <AppText tone="accent" testID="label">
          AGREED PRICE
        </AppText>
      </PortalThemeProvider>,
    );
    expect(screen.getByTestId("label")).toHaveStyle({ color: PORTAL_ACCENT_TEXT[portal] });
  });

  it("throws when usePortalTheme is called outside a provider", async () => {
    // NOTE: deviation from the brief's literal test body — this uses the async
    // `.rejects.toThrow(...)` form instead of a synchronous `expect(() =>
    // render(...)).toThrow(...)`. Same @testing-library/react-native@14.0.1
    // `render()` API change as above: `render()` is now an async function that
    // performs the actual render inside `await act(...)`, so a component that
    // throws during render causes the promise `render()` returns to reject
    // rather than causing a synchronous throw. Jest's synchronous `.toThrow()`
    // does not await a returned promise, so it reported "did not throw" even
    // though the render did throw (visible via unhandled rejection / console
    // error). `.rejects.toThrow(...)` awaits the rejection correctly.
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(async () => render(<Probe />)).rejects.toThrow(
      "usePortalTheme must be used within a PortalThemeProvider",
    );
    spy.mockRestore();
  });
});
