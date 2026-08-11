import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import OrgSettings from "../app/(org)/settings";
import { useSessionStore } from "../src/store/session";

const mockGet = jest.fn();
const mockUpdate = jest.fn();
jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return {
    ...actual,
    getOrganizationDetail: (...a: unknown[]) => mockGet(...a),
    updateOwnOrganization: (...a: unknown[]) => mockUpdate(...a),
  };
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

const ORG = {
  id: "o1",
  name: "Riverside Medical Center",
  status: "active" as const,
  orgType: "hospital",
  address: { street: "480 Riverside Drive", city: "Newark", state: "NJ", zip: "07102" },
  dockAccess: true,
};

function renderSettings() {
  return render(
    <PortalThemeProvider portal="org">
      <OrgSettings />
    </PortalThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(ORG);
  mockUpdate.mockResolvedValue(undefined);
  useSessionStore.setState({
    status: "ready",
    userId: "u1",
    assignments: [
      { role: "org_owner", scopeType: "organization", scopeId: "o1", scopeName: ORG.name },
    ],
    activeIndex: 0,
  });
});

describe("Organization settings", () => {
  it("opens with the organization's current details", async () => {
    await renderSettings();

    await waitFor(() => expect(screen.getByLabelText("Organization name")).toBeTruthy());
    expect(screen.getByLabelText("Organization name").props.value).toBe(ORG.name);
    expect(screen.getByLabelText("Street address").props.value).toBe("480 Riverside Drive");
    expect(screen.getByLabelText("ZIP code").props.value).toBe("07102");
  });

  it("saves an edit through the RPC", async () => {
    await renderSettings();
    await waitFor(() => expect(screen.getByLabelText("Organization name")).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText("City"), "Cambridge");
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith("o1", expect.objectContaining({ city: "Cambridge" })),
    );
  });

  it("refuses to send an obviously wrong ZIP", async () => {
    await renderSettings();
    await waitFor(() => expect(screen.getByLabelText("Organization name")).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText("ZIP code"), "123");
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("Enter a valid ZIP code")).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("surfaces a refusal from the server rather than claiming success", async () => {
    mockUpdate.mockRejectedValue(
      new Error("Only an organization owner or admin can change these details"),
    );
    await renderSettings();
    await waitFor(() => expect(screen.getByLabelText("Organization name")).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(
        screen.getByText("Only an organization owner or admin can change these details"),
      ).toBeTruthy(),
    );
  });
});
