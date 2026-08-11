import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import NewPickupRequest from "../app/(org)/request/new";
import { useSessionStore } from "../src/store/session";

const mockCreate = jest.fn();
jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return { ...actual, createPickupRequest: (...a: unknown[]) => mockCreate(...a) };
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

// (org)/_layout.tsx supplies this in the app; rendering the screen directly
// bypasses that layout, so the portal theme has to come from here.
function renderWizard() {
  return render(
    <PortalThemeProvider portal="org">
      <NewPickupRequest />
    </PortalThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({ id: "req-1" });
  useSessionStore.setState({
    status: "ready",
    userId: "u1",
    assignments: [
      {
        role: "org_owner",
        scopeType: "organization",
        scopeId: "o1",
        scopeName: "Riverside Medical Center",
      },
    ],
    activeIndex: 0,
  });
});

/** Walks all four steps with valid input, stopping on the review screen. */
async function completeWizard() {
  // Step 1 -- quantity. The default tier and count are already valid.
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));

  // Step 2 -- categories.
  await fireEvent.press(screen.getByLabelText("Computers & Laptops"));
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));

  // Step 3 -- schedule and contact.
  await fireEvent.press(screen.getByLabelText("Preferred date"));
  await fireEvent.press(screen.getAllByRole("button", { name: /\w+, \w+ \d+/ })[0]!);
  await fireEvent.press(screen.getByLabelText("Time window"));
  await fireEvent.press(screen.getByRole("button", { name: "8 – 11 AM" }));
  await fireEvent.changeText(screen.getByLabelText("On-site point of contact"), "Dana Reyes");
  await fireEvent.changeText(screen.getByLabelText("Contact phone"), "5550192345");
  await fireEvent.changeText(screen.getByLabelText("Facility dock address"), "480 Riverside Drive, Dock A");
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
}

describe("New pickup request wizard", () => {
  it("sends the entered request to the API on submit", async () => {
    await renderWizard();
    await completeWizard();

    await fireEvent.press(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      "o1",
      expect.objectContaining({
        sizeTier: "tier_10_30",
        unitCount: 25,
        categories: ["computers_laptops"],
        onSiteContactName: "Dana Reyes",
        onSiteContactPhone: "5550192345",
        dockAddress: "480 Riverside Drive, Dock A",
      }),
    );
  });

  it("shows the confirmation screen once the request is saved", async () => {
    await renderWizard();
    await completeWizard();

    await fireEvent.press(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(screen.getByText("Request submitted")).toBeTruthy());
  });

  it("keeps the user on review and explains a failed save", async () => {
    mockCreate.mockRejectedValue(new Error("Network unreachable"));
    await renderWizard();
    await completeWizard();

    await fireEvent.press(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(screen.getByText("Network unreachable")).toBeTruthy());
    expect(screen.queryByText("Request submitted")).toBeNull();
  });

  it("blocks a count below the ten-device minimum", async () => {
    await renderWizard();
    await fireEvent.changeText(screen.getByLabelText("Exact unit count"), "9");
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Minimum 10 devices required for pickup")).toBeTruthy();
  });
});
