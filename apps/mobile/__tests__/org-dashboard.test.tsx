import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import OrgDashboard from "../app/(org)/dashboard";
import { useSessionStore } from "../src/store/session";

const mockProfileName = jest.fn();
const mockOrg = jest.fn();
const mockRequests = jest.fn();
const mockSummary = jest.fn();
const mockSignOut = jest.fn();

jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return {
    ...actual,
    getProfileName: (...a: unknown[]) => mockProfileName(...a),
    getOrganization: (...a: unknown[]) => mockOrg(...a),
    listRecentPickupRequests: (...a: unknown[]) => mockRequests(...a),
    getOrgSummary: (...a: unknown[]) => mockSummary(...a),
    signOut: (...a: unknown[]) => mockSignOut(...a),
  };
});

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn() }),
}));

const ACTIVE_ORG = { id: "o1", name: "Riverside Medical Center", status: "active" as const };

function signInAsOrgOwner() {
  useSessionStore.setState({
    status: "ready",
    userId: "u1",
    assignments: [{ role: "org_owner", scopeType: "organization", scopeId: "o1", scopeName: "Riverside Medical Center" }],
    activeIndex: 0,
  });
}

// In the app this comes from (org)/_layout.tsx, whose RoleGuard wraps every
// org screen in the portal theme. Rendering the screen directly in a test
// bypasses that layout, so the provider has to be supplied here.
function renderDashboard() {
  return render(
    <PortalThemeProvider portal="org">
      <OrgDashboard />
    </PortalThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockProfileName.mockResolvedValue("Karim Rahman");
  mockOrg.mockResolvedValue(ACTIVE_ORG);
  mockRequests.mockResolvedValue([]);
  mockSummary.mockResolvedValue({
    activeCount: 0,
    activeDevices: 0,
    nextPickup: null,
    completedCount: 0,
    devicesRecycled: 0,
  });
  mockSignOut.mockResolvedValue(undefined);
  signInAsOrgOwner();
});

describe("S22 Organization dashboard", () => {
  it("greets the user by first name and names the organization", async () => {
    await renderDashboard();
    await waitFor(() => expect(screen.getByText(/Karim$/)).toBeTruthy());
    expect(screen.getByText("Riverside Medical Center")).toBeTruthy();
  });

  it("shows the empty state when the org has no requests", async () => {
    await renderDashboard();
    await waitFor(() => expect(screen.getByText("No pickups yet")).toBeTruthy());
  });

  it("lists submitted requests with their status", async () => {
    mockRequests.mockResolvedValue([
      { id: "r1", status: "pending", unitCount: 42, windowStart: "2026-08-10T12:00:00Z", createdAt: "2026-08-01T12:00:00Z" },
    ]);
    await renderDashboard();
    await waitFor(() => expect(screen.getByText("42 devices")).toBeTruthy());
    expect(screen.queryByText("No pickups yet")).toBeNull();
  });

  // Was asserted as disabled while the booking wizard was unbuilt; now that
  // request/new.tsx exists and submits, the CTA's job is to open it.
  it("opens the booking wizard from the pickup CTA", async () => {
    await renderDashboard();
    await waitFor(() => expect(screen.getByText("No pickups yet")).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Schedule Free Pickup" }));

    expect(mockPush).toHaveBeenCalledWith("/(org)/request/new");
  });

  // Signup now grants access outright (migration 0017), so there is no review
  // to report -- and a banner about one would describe a queue that no longer
  // exists. Kept as a test rather than deleted so the notice cannot creep back
  // in with a status the product no longer assigns.
  it("says nothing about verification, whatever status the org carries", async () => {
    mockOrg.mockResolvedValue({ ...ACTIVE_ORG, status: "pending_verification" });
    await renderDashboard();
    await waitFor(() => expect(screen.getByText("No pickups yet")).toBeTruthy());
    expect(screen.queryByText("Verification in review")).toBeNull();
  });

  it("surfaces a load failure with a retry that refetches", async () => {
    mockOrg.mockRejectedValueOnce(new Error("network is down"));
    await renderDashboard();
    await waitFor(() => expect(screen.getByText("network is down")).toBeTruthy());

    mockOrg.mockResolvedValue(ACTIVE_ORG);
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("No pickups yet")).toBeTruthy());
  });

  // Log out moved to the Me tab when the portal gained a tab bar -- one exit
  // per portal, not one per screen. Covered by me-screen.test.tsx; asserted
  // here only as an absence so a stray duplicate does not creep back in.
  it("leaves logging out to the Me tab", async () => {
    await renderDashboard();
    await waitFor(() => expect(screen.getByText("No pickups yet")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Log Out" })).toBeNull();
  });

  it("reports an account with no active organization instead of faking an empty one", async () => {
    useSessionStore.setState({ status: "ready", userId: "u1", assignments: [], activeIndex: 0 });
    await renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("No organization is active for this account.")).toBeTruthy(),
    );
    expect(mockOrg).not.toHaveBeenCalled();
  });
});
