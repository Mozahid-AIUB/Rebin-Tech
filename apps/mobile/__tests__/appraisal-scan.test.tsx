import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import { AppraisalScanSheet } from "../src/features/scan/AppraisalScanSheet";

const mockAppraise = jest.fn();
jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return { ...actual, appraisePhoto: (...a: unknown[]) => mockAppraise(...a) };
});

const mockLaunchCamera = jest.fn();
jest.mock("expo-image-picker", () => ({
  launchCameraAsync: (...a: unknown[]) => mockLaunchCamera(...a),
  requestCameraPermissionsAsync: () => Promise.resolve({ granted: true }),
}));

const PHOTO = { canceled: false, assets: [{ base64: "aGVsbG8=", mimeType: "image/jpeg" }] };

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
  mockLaunchCamera.mockResolvedValue(PHOTO);
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

  it("hands the quote everything it priced", async () => {
    const onDone = jest.fn();
    await renderSheet(onDone);
    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
    await waitFor(() => expect(screen.getByText("Business laptop")).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Use this quote" }));

    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({
        totalCents: 36000,
        catalogVersionId: "cat-1",
        items: expect.arrayContaining([expect.objectContaining({ componentKey: "laptop_business" })]),
      }),
    );
  });
});
