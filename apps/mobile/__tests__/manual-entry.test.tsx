import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import { ManualEntrySheet } from "../src/features/scan/ManualEntrySheet";

const mockPrices = jest.fn();
jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return { ...actual, listCurrentPrices: (...a: unknown[]) => mockPrices(...a) };
});

// Catalog v3: one row per component, priced by weight. "Business laptop" is
// weight-priced (avgWeightG set); "LCD monitor" is left per-item (avgWeightG
// null) so the per-item fallback path stays covered too.
const CATALOG = [
  {
    componentKey: "laptop_business",
    displayName: "Business laptop",
    category: "computers_laptops",
    grade: "parts" as const,
    unit: "lb" as const,
    unitPriceCents: 80,
    avgWeightG: 2000,
  },
  {
    componentKey: "monitor_lcd_24",
    displayName: 'LCD monitor, up to 24"',
    category: "monitors_displays",
    grade: "parts" as const,
    unit: "each" as const,
    unitPriceCents: 2500,
    avgWeightG: null,
  },
];

function renderSheet(onDone = jest.fn()) {
  return render(
    <PortalThemeProvider portal="business">
      <ManualEntrySheet visible onClose={jest.fn()} onDone={onDone} />
    </PortalThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrices.mockResolvedValue(CATALOG);
});

// The business portal had exactly one way in: take a live photo. A vendor who
// denied the camera permission, or whose warehouse is too dark to photograph,
// could not transact at all -- and a Gemini outage took the whole portal with
// it. This is the second door.
describe("Manual entry", () => {
  it("offers what the live catalog prices, one row per component", async () => {
    await renderSheet();

    // One row per component now -- catalog v3 has nothing left to choose
    // between, so there is exactly one button per key, not one per grade.
    await waitFor(() => expect(screen.getAllByText("Business laptop")).toHaveLength(1));
    expect(screen.getByText('LCD monitor, up to 24"')).toBeTruthy();
    expect(mockPrices).toHaveBeenCalledTimes(1);
  });

  it("has no grade control anywhere", async () => {
    await renderSheet();
    await waitFor(() => expect(screen.getByText("Business laptop")).toBeTruthy());

    expect(screen.queryByText("working")).toBeNull();
    expect(screen.queryByText("broken")).toBeNull();
    expect(screen.queryByText("parts")).toBeNull();
  });

  it("prices a weight-based line as quantity x weight x rate", async () => {
    await renderSheet();
    await waitFor(() => expect(screen.getByRole("button", { name: "Business laptop" })).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Business laptop" }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "12");
    await fireEvent.press(screen.getByRole("button", { name: "Add to quote" }));

    // 12 x 2000g (4.4 lb) = 52.9 lb at $0.80/lb -> $42.33 (rounded at the
    // line, the same way create_quote rounds it).
    await waitFor(() => expect(screen.getByText("12 × 4.4 lbs = 52.9 lbs at $0.80/lb")).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText("$42.33")).toHaveLength(2));
  });

  it("prices a per-item line without a weight, unchanged", async () => {
    await renderSheet();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: 'LCD monitor, up to 24"' })).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole("button", { name: 'LCD monitor, up to 24"' }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "3");
    await fireEvent.press(screen.getByRole("button", { name: "Add to quote" }));

    await waitFor(() => expect(screen.getAllByText("$75.00")).toHaveLength(2));
  });

  it("totals lines of different components separately", async () => {
    await renderSheet();
    await waitFor(() => expect(screen.getByRole("button", { name: "Business laptop" })).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Business laptop" }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "12");
    await fireEvent.press(screen.getByRole("button", { name: "Add to quote" }));

    await fireEvent.press(screen.getByRole("button", { name: 'LCD monitor, up to 24"' }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "1");
    await fireEvent.press(screen.getByRole("button", { name: "Add to quote" }));

    // 4233 (laptops) + 2500 (one monitor) = 6733.
    await waitFor(() => expect(screen.getByText("$67.33")).toBeTruthy());
  });

  // The whole point of the second door: a hand-typed line is marked as one, so
  // an operator reviewing a quote can see it was never photographed.
  it("marks every line as entered by hand, with no confidence", async () => {
    const onDone = jest.fn();
    await renderSheet(onDone);
    await waitFor(() => expect(screen.getByRole("button", { name: "Business laptop" })).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Business laptop" }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "2");
    await fireEvent.press(screen.getByRole("button", { name: "Add to quote" }));
    await fireEvent.press(screen.getByRole("button", { name: "Use this quote · $7.05" }));

    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({
        totalCents: 705,
        items: [
          expect.objectContaining({
            componentKey: "laptop_business",
            quantity: 2,
            source: "manual",
            confidence: null,
            weightG: 4000,
          }),
        ],
      }),
    );
  });

  it("refuses a quantity that is not a positive number", async () => {
    await renderSheet();
    await waitFor(() => expect(screen.getByRole("button", { name: "Business laptop" })).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Business laptop" }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "0");

    expect(screen.getByRole("button", { name: "Add to quote" }).props.accessibilityState.disabled).toBe(
      true,
    );
  });

  it("lets a line be taken back off", async () => {
    await renderSheet();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: 'LCD monitor, up to 24"' })).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole("button", { name: 'LCD monitor, up to 24"' }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "1");
    await fireEvent.press(screen.getByRole("button", { name: "Add to quote" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Use this quote · $25.00" })).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole("button", { name: 'Remove LCD monitor, up to 24"' }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Use this quote" }).props.accessibilityState.disabled).toBe(
        true,
      ),
    );
  });

  // A catalog that will not load leaves nothing to pick from, so it has to say
  // why rather than render an empty list that looks like an empty catalog.
  it("explains a catalog that would not load", async () => {
    mockPrices.mockRejectedValue(new Error("network"));
    await renderSheet();

    await waitFor(() => expect(screen.getByText(/Couldn't load the price list/)).toBeTruthy());
  });
});
