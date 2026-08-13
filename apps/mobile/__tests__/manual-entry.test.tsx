import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import { ManualEntrySheet } from "../src/features/scan/ManualEntrySheet";

const mockPrices = jest.fn();
jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return { ...actual, listCurrentPrices: (...a: unknown[]) => mockPrices(...a) };
});

const CATALOG = [
  {
    componentKey: "laptop_business",
    displayName: "Business laptop",
    category: "computers_laptops",
    grade: "working" as const,
    unit: "each" as const,
    unitPriceCents: 12000,
  },
  {
    componentKey: "laptop_business",
    displayName: "Business laptop",
    category: "computers_laptops",
    grade: "broken" as const,
    unit: "each" as const,
    unitPriceCents: 3500,
  },
  {
    componentKey: "monitor_lcd_24",
    displayName: 'LCD monitor, up to 24"',
    category: "monitors_displays",
    grade: "working" as const,
    unit: "each" as const,
    unitPriceCents: 2500,
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
  it("offers what the live catalog prices, not a hardcoded list", async () => {
    await renderSheet();

    // Two rows for the laptop, one per grade the catalog prices it at.
    await waitFor(() => expect(screen.getAllByText("Business laptop")).toHaveLength(2));
    expect(screen.getByText('LCD monitor, up to 24"')).toBeTruthy();
    expect(mockPrices).toHaveBeenCalledTimes(1);
  });

  it("prices a line from the catalog once a quantity is set", async () => {
    await renderSheet();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Business laptop, working" })).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Business laptop, working" }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "3");
    await fireEvent.press(screen.getByRole("button", { name: "Add to quote" }));

    await waitFor(() => expect(screen.getAllByText("$360.00")).toHaveLength(2));
  });

  it("totals lines of different grades separately", async () => {
    await renderSheet();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Business laptop, working" })).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Business laptop, working" }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "1");
    await fireEvent.press(screen.getByRole("button", { name: "Add to quote" }));

    await fireEvent.press(screen.getByRole("button", { name: "Business laptop, broken" }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "2");
    await fireEvent.press(screen.getByRole("button", { name: "Add to quote" }));

    // 12000 + 2 x 3500 = 19000. A broken laptop is a different product from a
    // working one, not a discount on it.
    await waitFor(() => expect(screen.getByText("$190.00")).toBeTruthy());
  });

  // The whole point of the second door: a hand-typed line is marked as one, so
  // an operator reviewing a quote can see it was never photographed.
  it("marks every line as entered by hand, with no confidence", async () => {
    const onDone = jest.fn();
    await renderSheet(onDone);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Business laptop, working" })).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Business laptop, working" }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "2");
    await fireEvent.press(screen.getByRole("button", { name: "Add to quote" }));
    await fireEvent.press(screen.getByRole("button", { name: "Use this quote · $240.00" }));

    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({
        totalCents: 24000,
        items: [
          expect.objectContaining({
            componentKey: "laptop_business",
            grade: "working",
            quantity: 2,
            source: "manual",
            confidence: null,
          }),
        ],
      }),
    );
  });

  it("refuses a quantity that is not a positive number", async () => {
    await renderSheet();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Business laptop, working" })).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Business laptop, working" }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "0");

    expect(screen.getByRole("button", { name: "Add to quote" }).props.accessibilityState.disabled).toBe(
      true,
    );
  });

  it("lets a line be taken back off", async () => {
    await renderSheet();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Business laptop, working" })).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Business laptop, working" }));
    await fireEvent.changeText(screen.getByLabelText("How many?"), "1");
    await fireEvent.press(screen.getByRole("button", { name: "Add to quote" }));
    // Asserted on the confirm button rather than the figure: at a quantity of
    // one the line total, the unit price and the catalog row all read $120.00,
    // so counting them proves nothing about which one moved.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Use this quote · $120.00" })).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Remove Business laptop" }));

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
