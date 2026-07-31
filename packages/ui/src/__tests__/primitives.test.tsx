import { fireEvent, render, screen } from "@testing-library/react-native";
import { Card, MoneyText, PillButton, PortalThemeProvider, StatusBadge, WeightText } from "../index";

const wrap = (ui: React.ReactElement) => (
  <PortalThemeProvider portal="business">{ui}</PortalThemeProvider>
);

// NOTE: deviation from the brief's literal test bodies — every `render(...)` call
// below is awaited and its enclosing `it` callback is `async`. This is the same
// @testing-library/react-native@14.0.1 deviation documented in
// packages/ui/src/__tests__/theme.test.tsx (and apps/mobile/__tests__/boot.test.tsx,
// see task-1-report.md): `render()` became async internally via `act()`, so the
// `screen` singleton is only populated once the returned promise resolves. Without
// awaiting, `screen.getByText`/`getByRole`/`getByTestId` hit the un-populated
// placeholder and throw "`render` function has not been called". No other change
// from the brief's literal test intent.

describe("MoneyText", () => {
  it("renders cents as formatted USD", async () => {
    await render(wrap(<MoneyText cents={46} />));
    expect(screen.getByText("$0.46")).toBeTruthy();
  });
  it("uses tabular figures so columns align", async () => {
    await render(wrap(<MoneyText cents={123456} />));
    expect(screen.getByText("$1,234.56")).toHaveStyle({ fontVariant: ["tabular-nums"] });
  });
});

describe("WeightText", () => {
  it("renders grams as lbs", async () => {
    await render(wrap(<WeightText grams={5624} />));
    expect(screen.getByText("12.4 lbs")).toBeTruthy();
  });
});

describe("StatusBadge", () => {
  it("renders a human-readable label", async () => {
    await render(wrap(<StatusBadge status="in_transit" />));
    expect(screen.getByText("In Transit")).toBeTruthy();
  });
  it("colors completed with the success token", async () => {
    await render(wrap(<StatusBadge status="completed" />));
    expect(screen.getByText("Completed")).toHaveStyle({ color: "#2E7D4F" });
  });
});

describe("PillButton", () => {
  it("calls onPress when tapped", async () => {
    const onPress = jest.fn();
    await render(wrap(<PillButton label="Continue" onPress={onPress} />));
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", async () => {
    const onPress = jest.fn();
    await render(wrap(<PillButton label="Continue" onPress={onPress} disabled />));
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("does not call onPress while loading", async () => {
    const onPress = jest.fn();
    await render(wrap(<PillButton label="Saving" onPress={onPress} loading />));
    fireEvent.press(screen.getByRole("button", { name: "Saving" }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("uses the portal accent as its primary background", async () => {
    await render(wrap(<PillButton label="Pay" onPress={jest.fn()} />));
    expect(screen.getByRole("button", { name: "Pay" })).toHaveStyle({ backgroundColor: "#B8862F" });
  });

  it("meets the 44pt minimum hit target", async () => {
    await render(wrap(<PillButton label="Tap" onPress={jest.fn()} />));
    expect(screen.getByRole("button", { name: "Tap" })).toHaveStyle({ minHeight: 52 });
  });
});

describe("Card", () => {
  it("renders its children", async () => {
    await render(wrap(<Card><MoneyText cents={100} /></Card>));
    expect(screen.getByText("$1.00")).toBeTruthy();
  });
  it("uses the surface token by default", async () => {
    await render(wrap(<Card testID="c"><MoneyText cents={0} /></Card>));
    expect(screen.getByTestId("c")).toHaveStyle({ backgroundColor: "#FFFFFF" });
  });
  it("uses the mint tint for the alt variant", async () => {
    await render(wrap(<Card testID="c" variant="alt"><MoneyText cents={0} /></Card>));
    expect(screen.getByTestId("c")).toHaveStyle({ backgroundColor: "#EFF3EC" });
  });
});
