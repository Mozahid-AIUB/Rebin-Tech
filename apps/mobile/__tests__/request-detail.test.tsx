import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import RequestDetail from "../app/(org)/request/[id]";

const mockGet = jest.fn();
const mockCancel = jest.fn();
const mockReschedule = jest.fn();

jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return {
    ...actual,
    getPickupRequest: (...a: unknown[]) => mockGet(...a),
    cancelPickupRequest: (...a: unknown[]) => mockCancel(...a),
    reschedulePickupRequest: (...a: unknown[]) => mockReschedule(...a),
  };
});

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => ({ id: "req-1" }),
}));

const REQUEST = {
  id: "req-1",
  status: "pending" as const,
  sizeTier: "tier_10_30",
  unitCount: 25,
  categories: ["computers_laptops", "monitors_displays"],
  windowStart: "2026-08-20T12:00:00.000Z",
  windowEnd: "2026-08-20T15:00:00.000Z",
  timezone: "America/New_York",
  onSiteContactName: "Dana Reyes",
  onSiteContactPhone: "5550192345",
  dockAddress: "480 Riverside Drive, Dock A",
  instructions: "Ring the bell at the loading bay",
  createdAt: "2026-08-11T09:00:00.000Z",
};

function renderDetail() {
  return render(
    <PortalThemeProvider portal="org">
      <RequestDetail />
    </PortalThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(REQUEST);
  mockCancel.mockResolvedValue(undefined);
  mockReschedule.mockResolvedValue(undefined);
});

describe("Pickup request detail", () => {
  it("shows what was booked", async () => {
    await renderDetail();

    await waitFor(() => expect(screen.getByText("25 devices")).toBeTruthy());
    expect(screen.getByText(/Computers & Laptops/)).toBeTruthy();
    expect(screen.getByText("Dana Reyes")).toBeTruthy();
    expect(screen.getByText("480 Riverside Drive, Dock A")).toBeTruthy();
    expect(screen.getByText("Ring the bell at the loading bay")).toBeTruthy();
  });

  it("renders the window in the facility's timezone, not the viewer's", async () => {
    await renderDetail();

    // 12:00-15:00 UTC is 8-11 AM in America/New_York during EDT. A viewer in
    // any other zone must still see the time the dock staff will be waiting.
    await waitFor(() => expect(screen.getByText(/8:00 AM . 11:00 AM/)).toBeTruthy());
  });

  it("cancels through the RPC and reflects the new status", async () => {
    await renderDetail();
    await waitFor(() => expect(screen.getByText("25 devices")).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Cancel pickup" }));
    await fireEvent.press(screen.getByRole("button", { name: "Yes, cancel it" }));

    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith("req-1"));
  });

  it("explains a refused cancellation instead of pretending it worked", async () => {
    mockCancel.mockRejectedValue(new Error("A dispatched pickup can no longer be cancelled"));
    await renderDetail();
    await waitFor(() => expect(screen.getByText("25 devices")).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Cancel pickup" }));
    await fireEvent.press(screen.getByRole("button", { name: "Yes, cancel it" }));

    await waitFor(() =>
      expect(screen.getByText("A dispatched pickup can no longer be cancelled")).toBeTruthy(),
    );
  });

  it("hides both actions once the pickup is on its way", async () => {
    mockGet.mockResolvedValue({ ...REQUEST, status: "dispatched" });
    await renderDetail();

    await waitFor(() => expect(screen.getByText("25 devices")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Cancel pickup" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reschedule" })).toBeNull();
  });

  it("marks how far along the pickup is", async () => {
    mockGet.mockResolvedValue({ ...REQUEST, status: "scheduled" });
    await renderDetail();

    // The stages are drawn as a copper trace now (packages/ui Trace), with the
    // vias filled up to the stage reached. The labels are the assertion --
    // the SVG route is presentation.
    await waitFor(() => expect(screen.getByText("Submitted")).toBeTruthy());
    expect(screen.getByText("Agent dispatched")).toBeTruthy();
    expect(screen.getByText("Scheduled")).toBeTruthy();
    // The stamp is set in caps, the way a pressed stamp is, so it reads as a
    // separate mark from the stage of the same name.
    expect(screen.getByText("SCHEDULED")).toBeTruthy();
  });
});
