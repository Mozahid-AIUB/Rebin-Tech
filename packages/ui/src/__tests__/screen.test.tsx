import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { PortalThemeProvider, Screen, tokens } from "../index";

const INSET_BOTTOM = 16;

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));
jest.mock("expo-blur", () => ({ BlurView: require("react-native").View }));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

/** The padding the scrolling body reserves at its foot. */
function bottomClearance(): number {
  const styles = screen.getByTestId("last-row").parent?.props?.style;
  const flat = Array.isArray(styles) ? Object.assign({}, ...styles) : styles;
  return flat?.paddingBottom ?? 0;
}

describe("Screen clearance", () => {
  // The tab bar is absolutely positioned, so it takes up no layout space and
  // the body has to reserve its height by hand. Screen and PortalTabs both
  // read the same token, so a portal's last row never sits under its bar.
  // Asserted exactly, not as "at least" -- an equality check is what catches a
  // screen reserving the wrong portal's bar height.
  it.each(["org", "business"] as const)("clears the %s tab bar and the safe area", async (portal) => {
    await render(
      <PortalThemeProvider portal={portal}>
        <Screen>
          <Text testID="last-row">Total</Text>
        </Screen>
      </PortalThemeProvider>,
    );

    expect(bottomClearance()).toBe(tokens.space[7] + tokens.layout.tabBar[portal] + INSET_BOTTOM);
  });

  it("gives both portals the same tab bar height", () => {
    expect(tokens.layout.tabBar.business).toBe(tokens.layout.tabBar.org);
  });
});
