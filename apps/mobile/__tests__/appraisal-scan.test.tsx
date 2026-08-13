import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import { AppraisalScanSheet } from "../src/features/scan/AppraisalScanSheet";

const mockAppraise = jest.fn();
jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return { ...actual, appraisePhoto: (...a: unknown[]) => mockAppraise(...a) };
});

const mockCapture = jest.fn();
jest.mock("../src/features/scan/capture", () => ({
  capturePhotoForScan: (...a: unknown[]) => mockCapture(...a),
}));

const APPRAISAL = {
  items: [
    {
      componentKey: "laptop_business",
      displayName: "Business laptop",
      grade: "working" as const,
      quantity: 3,
      confidence: 93,
      notes: "Dell Latitude, screens intact",
      unit: "each" as const,
      unitPriceCents: 12000,
      lineTotalCents: 36000,
    },
  ],
  totalCents: 36000,
  catalogVersionId: "cat-1",
};

function renderSheet(onDone = jest.fn()) {
  return render(
    <PortalThemeProvider portal="business">
      <AppraisalScanSheet visible onClose={jest.fn()} onDone={onDone} />
    </PortalThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCapture.mockResolvedValue({ ok: true, photo: { base64: "aGVsbG8=", mimeType: "image/jpeg" } });
  mockAppraise.mockResolvedValue(APPRAISAL);
});

describe("Appraisal scan", () => {
  it("shows what was found and what it pays", async () => {
    await renderSheet();

    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));

    await waitFor(() => expect(screen.getByText("Business laptop")).toBeTruthy());
    expect(screen.getByText(/3 ×/)).toBeTruthy();
    // Cents in, dollars out -- a vendor reads money, not integers. Appears
    // twice with a single line: once on the line, once as the running total.
    expect(screen.getAllByText("$360.00").length).toBe(2);
  });

  it("totals every line into one offer", async () => {
    mockAppraise.mockResolvedValue({
      ...APPRAISAL,
      items: [
        APPRAISAL.items[0]!,
        {
          componentKey: "monitor_lcd_24",
          displayName: 'LCD monitor, up to 24"',
          grade: "broken" as const,
          quantity: 2,
          confidence: 88,
          notes: "cracked panels",
          unit: "each" as const,
          unitPriceCents: 500,
          lineTotalCents: 1000,
        },
      ],
      totalCents: 37000,
    });
    await renderSheet();

    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));

    await waitFor(() => expect(screen.getByText("$370.00")).toBeTruthy());
  });

  // A grade the model was unsure of is worth real money, so it has to be
  // arguable rather than quietly accepted.
  it("flags a low-confidence grade for review", async () => {
    mockAppraise.mockResolvedValue({
      ...APPRAISAL,
      items: [{ ...APPRAISAL.items[0]!, confidence: 71 }],
    });
    await renderSheet();

    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));

    await waitFor(() => expect(screen.getByText("Check this one")).toBeTruthy());
  });

  it("says so when nothing in the photo is something we buy", async () => {
    mockAppraise.mockResolvedValue({ items: [], totalCents: 0, catalogVersionId: null });
    await renderSheet();

    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));

    await waitFor(() => expect(screen.getByText(/Nothing we buy/i)).toBeTruthy());
  });

  it("explains a failed appraisal without losing earlier lines", async () => {
    await renderSheet();
    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
    await waitFor(() => expect(screen.getByText("Business laptop")).toBeTruthy());

    mockAppraise.mockRejectedValue(new Error("Couldn't read that photo."));
    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));

    await waitFor(() => expect(screen.getByText("Couldn't read that photo.")).toBeTruthy());
    expect(screen.getByText("Business laptop")).toBeTruthy();
  });

  // The model counts what it can see, and a pallet hides most of itself. Until
  // now a vendor who could see eleven laptops where the photo showed three had
  // one move available: delete the line and photograph it again. The count is
  // what the offer is multiplied by, so it has to be arguable.
  describe("correcting the count", () => {
    it("reprices the line and the total when the count is raised", async () => {
      await renderSheet();
      await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
      await waitFor(() => expect(screen.getByText("Business laptop")).toBeTruthy());

      await fireEvent.press(screen.getByRole("button", { name: "One more Business laptop" }));

      // 4 x 12000, on the line and again as the running total.
      await waitFor(() => expect(screen.getAllByText("$480.00")).toHaveLength(2));
      expect(screen.getByText(/4 ×/)).toBeTruthy();
    });

    it("reprices when the count is lowered", async () => {
      await renderSheet();
      await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
      await waitFor(() => expect(screen.getByText("Business laptop")).toBeTruthy());

      await fireEvent.press(screen.getByRole("button", { name: "One fewer Business laptop" }));

      await waitFor(() => expect(screen.getAllByText("$240.00")).toHaveLength(2));
    });

    // Removing is its own button. A quantity that could reach zero would leave
    // a $0 line on the quote that reads as an item worth nothing rather than
    // an item that is not there.
    it("will not take a count below one", async () => {
      mockAppraise.mockResolvedValue({
        ...APPRAISAL,
        items: [{ ...APPRAISAL.items[0]!, quantity: 1, lineTotalCents: 12000 }],
        totalCents: 12000,
      });
      await renderSheet();
      await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
      await waitFor(() => expect(screen.getByText("Business laptop")).toBeTruthy());

      const fewer = screen.getByRole("button", { name: "One fewer Business laptop" });
      expect(fewer.props.accessibilityState.disabled).toBe(true);
    });

    it("sends the corrected count to the quote, not the one the model returned", async () => {
      const onDone = jest.fn();
      await renderSheet(onDone);
      await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
      await waitFor(() => expect(screen.getByText("Business laptop")).toBeTruthy());

      await fireEvent.press(screen.getByRole("button", { name: "One more Business laptop" }));
      await waitFor(() => expect(screen.getByText(/4 ×/)).toBeTruthy());
      await fireEvent.press(screen.getByRole("button", { name: "Use this quote · $480.00" }));

      expect(onDone).toHaveBeenCalledWith(
        expect.objectContaining({
          totalCents: 48000,
          items: [expect.objectContaining({ quantity: 4, lineTotalCents: 48000 })],
        }),
      );
    });
  });

  // A vendor whose photo will not read is stuck staring at an error with only
  // a camera button under it. The way out has to be offered where they hit the
  // wall, not left on a screen they have to know to go back to.
  it("offers the by-hand path when a photo will not read", async () => {
    const onFallback = jest.fn();
    mockAppraise.mockRejectedValue(new Error("Couldn't read that photo."));
    await render(
      <PortalThemeProvider portal="business">
        <AppraisalScanSheet visible onClose={jest.fn()} onDone={jest.fn()} onFallback={onFallback} />
      </PortalThemeProvider>,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
    await waitFor(() => expect(screen.getByText("Couldn't read that photo.")).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Add them by hand instead" }));

    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  // Only after a failure. Offering it up front would make the camera look like
  // the harder of two options on a screen built around the camera.
  it("keeps the by-hand offer out of the way until something fails", async () => {
    await renderSheet();

    expect(screen.queryByRole("button", { name: "Add them by hand instead" })).toBeNull();
  });

  it("hands the quote everything it priced", async () => {
    const onDone = jest.fn();
    await renderSheet(onDone);
    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
    await waitFor(() => expect(screen.getByText("Business laptop")).toBeTruthy());

    // The button carries the total once there is one, so a vendor confirms a
    // figure rather than a noun.
    await fireEvent.press(screen.getByRole("button", { name: "Use this quote · $360.00" }));

    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({
        totalCents: 36000,
        catalogVersionId: "cat-1",
        items: expect.arrayContaining([expect.objectContaining({ componentKey: "laptop_business" })]),
      }),
    );
  });
});
