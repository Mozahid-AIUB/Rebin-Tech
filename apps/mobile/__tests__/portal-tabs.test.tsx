import { render } from "@testing-library/react-native";
import { PortalTabs } from "../src/features/portal/PortalTabs";
import { HomeIcon } from "../src/features/portal/TabIcons";

// expo-router's <Tabs> auto-discovers every route file in its group, so a
// screen that isn't a tab (the booking wizard at request/new) silently
// appears in the bar unless it is declared and hidden. Recording the props
// each <Tabs.Screen> receives is the only way to see that from a test.
const screenProps: { name: string; options?: { href?: unknown; title?: string } }[] = [];

jest.mock("expo-router", () => {
  const React = require("react");
  function Tabs({ children }: { children: React.ReactNode }) {
    return React.createElement(React.Fragment, null, children);
  }
  Tabs.Screen = (props: { name: string; options?: Record<string, unknown> }) => {
    screenProps.push(props as never);
    return null;
  };
  return { Tabs };
});

const TABS = [{ name: "dashboard", title: "Home", Icon: HomeIcon }] as const;

beforeEach(() => {
  screenProps.length = 0;
});

describe("PortalTabs", () => {
  it("renders a tab for each declared route", async () => {
    await render(<PortalTabs portal="org" tabs={TABS} />);

    expect(screenProps.map((s) => s.name)).toContain("dashboard");
    expect(screenProps.find((s) => s.name === "dashboard")?.options?.title).toBe("Home");
  });

  it("keeps non-tab routes out of the bar", async () => {
    await render(<PortalTabs portal="org" tabs={TABS} hidden={["request/new"]} />);

    const wizard = screenProps.find((s) => s.name === "request/new");
    expect(wizard).toBeDefined();
    // href: null is expo-router's way of registering a route without giving it
    // a tab button.
    expect(wizard?.options?.href).toBeNull();
  });
});
