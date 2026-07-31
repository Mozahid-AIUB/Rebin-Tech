import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { PortalThemeProvider, tokens, usePortalTheme } from "../index";

function Probe() {
  const { portal, accent } = usePortalTheme();
  return <Text testID="probe">{`${portal}:${accent}`}</Text>;
}

describe("tokens", () => {
  it("uses the exact cream background from the spec", () => {
    expect(tokens.color.bg).toBe("#F6F4ED");
  });
  it("uses the exact forest-green primary", () => {
    expect(tokens.color.primary).toBe("#2E6B4F");
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
    ["org", "#2E6B4F"],
    ["business", "#B8862F"],
    ["agent", "#1F7A6B"],
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
