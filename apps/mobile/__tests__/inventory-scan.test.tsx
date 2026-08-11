import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import { InventoryScanSheet } from "../src/features/scan/InventoryScanSheet";

const mockScan = jest.fn();
jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return { ...actual, scanInventoryPhoto: (...a: unknown[]) => mockScan(...a) };
});

const mockLaunchCamera = jest.fn();
jest.mock("expo-image-picker", () => ({
  launchCameraAsync: (...a: unknown[]) => mockLaunchCamera(...a),
  requestCameraPermissionsAsync: () => Promise.resolve({ granted: true }),
  MediaTypeOptions: { Images: "Images" },
}));

const PHOTO = { canceled: false, assets: [{ base64: "aGVsbG8=", mimeType: "image/jpeg" }] };

function renderSheet(onDone = jest.fn()) {
  return render(
    <PortalThemeProvider portal="org">
      <InventoryScanSheet visible onClose={jest.fn()} onDone={onDone} />
    </PortalThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLaunchCamera.mockResolvedValue(PHOTO);
  mockScan.mockResolvedValue({
    items: [
      {
        deviceCategory: "computers_laptops",
        make: "Dell",
        model: "OptiPlex 7090",
        serial: "ABC123",
        confidence: 96,
      },
    ],
  });
});

describe("Inventory scan", () => {
  it("adds what the camera identified to the running list", async () => {
    await renderSheet();

    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));

    await waitFor(() => expect(screen.getByText(/Dell OptiPlex 7090/)).toBeTruthy());
    expect(screen.getByText(/ABC123/)).toBeTruthy();
  });

  // A serial nobody checked is worse than none on a compliance manifest, so a
  // low-confidence read has to be visibly flagged rather than silently kept.
  it("flags a low-confidence read for review", async () => {
    mockScan.mockResolvedValue({
      items: [
        {
          deviceCategory: "monitors_displays",
          make: null,
          model: null,
          serial: null,
          confidence: 74,
        },
      ],
    });
    await renderSheet();

    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));

    await waitFor(() => expect(screen.getByText("Check this one")).toBeTruthy());
  });

  it("keeps a bad response out of the list instead of showing junk", async () => {
    mockScan.mockResolvedValue({ items: [{ deviceCategory: "toaster", confidence: 90 }] });
    await renderSheet();

    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));

    await waitFor(() => expect(screen.getByText(/Couldn't read that photo/)).toBeTruthy());
  });

  it("explains a failed scan without losing what was already found", async () => {
    await renderSheet();
    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
    await waitFor(() => expect(screen.getByText(/Dell OptiPlex 7090/)).toBeTruthy());

    mockScan.mockRejectedValue(new Error("Couldn't read that photo. Try again with more light."));
    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));

    await waitFor(() =>
      expect(screen.getByText("Couldn't read that photo. Try again with more light.")).toBeTruthy(),
    );
    expect(screen.getByText(/Dell OptiPlex 7090/)).toBeTruthy();
  });

  it("hands the wizard everything it found", async () => {
    const onDone = jest.fn();
    await renderSheet(onDone);
    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
    await waitFor(() => expect(screen.getByText(/Dell OptiPlex 7090/)).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Add 1 device" }));

    expect(onDone).toHaveBeenCalledWith([
      expect.objectContaining({ deviceCategory: "computers_laptops", serial: "ABC123" }),
    ]);
  });

  it("does nothing when the camera is dismissed", async () => {
    mockLaunchCamera.mockResolvedValue({ canceled: true, assets: null });
    await renderSheet();

    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));

    await waitFor(() => expect(mockScan).not.toHaveBeenCalled());
  });
});
