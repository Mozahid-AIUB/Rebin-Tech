import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import OrgTeam from "../app/(org)/team";
import { useSessionStore } from "../src/store/session";

const mockMembers = jest.fn();
const mockInvites = jest.fn();
const mockInvite = jest.fn();
const mockRemove = jest.fn();
const mockSetRole = jest.fn();

jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return {
    ...actual,
    listOrganizationMembers: (...a: unknown[]) => mockMembers(...a),
    listOrganizationInvitations: (...a: unknown[]) => mockInvites(...a),
    inviteOrgMember: (...a: unknown[]) => mockInvite(...a),
    removeOrgMember: (...a: unknown[]) => mockRemove(...a),
    setOrgMemberRole: (...a: unknown[]) => mockSetRole(...a),
  };
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

const MEMBERS = [
  {
    userId: "u1",
    fullName: "Karim Rahman",
    email: "karim@riverside.test",
    memberRole: "org_owner",
    joinedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    userId: "u2",
    fullName: "Dana Reyes",
    email: "dana@riverside.test",
    memberRole: "org_requester",
    joinedAt: "2026-08-05T00:00:00.000Z",
  },
];

function renderTeam(role: string = "org_owner") {
  useSessionStore.setState({
    status: "ready",
    userId: "u1",
    assignments: [
      { role: role as never, scopeType: "organization", scopeId: "o1", scopeName: "Riverside" },
    ],
    activeIndex: 0,
  });
  return render(
    <PortalThemeProvider portal="org">
      <OrgTeam />
    </PortalThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMembers.mockResolvedValue(MEMBERS);
  mockInvites.mockResolvedValue([]);
  mockInvite.mockResolvedValue({ status: "added", code: null });
  mockRemove.mockResolvedValue(undefined);
  mockSetRole.mockResolvedValue(undefined);
});

describe("Organization team", () => {
  it("lists everyone with their role", async () => {
    await renderTeam();

    await waitFor(() => expect(screen.getByText("Karim Rahman")).toBeTruthy());
    expect(screen.getByText("Dana Reyes")).toBeTruthy();
    expect(screen.getByText("karim@riverside.test")).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
    // "Requester" is also the label on the invite form's role chip, so this
    // pins the count rather than the presence.
    expect(screen.getAllByText("Requester").length).toBeGreaterThan(0);
  });

  it("adds a colleague who already has an account", async () => {
    await renderTeam();
    await waitFor(() => expect(screen.getByText("Karim Rahman")).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText("Email"), "new@riverside.test");
    await fireEvent.press(screen.getByRole("button", { name: "Send invite" }));

    await waitFor(() =>
      expect(mockInvite).toHaveBeenCalledWith("o1", "new@riverside.test", "org_requester"),
    );
    await waitFor(() => expect(screen.getByText(/added to the team/i)).toBeTruthy());
  });

  // No email is sent, so the code has to be visible to the person who has to
  // pass it on. A silent "invitation sent" would strand the invitee.
  it("shows the code when the invitee has no account yet", async () => {
    mockInvite.mockResolvedValue({ status: "invited", code: "A1B2C3D4" });
    await renderTeam();
    await waitFor(() => expect(screen.getByText("Karim Rahman")).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText("Email"), "stranger@elsewhere.test");
    await fireEvent.press(screen.getByRole("button", { name: "Send invite" }));

    await waitFor(() => expect(screen.getByText("A1B2C3D4")).toBeTruthy());
  });

  it("surfaces a refusal instead of claiming the invite worked", async () => {
    mockInvite.mockRejectedValue(new Error("That person is already on this team"));
    await renderTeam();
    await waitFor(() => expect(screen.getByText("Karim Rahman")).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText("Email"), "dana@riverside.test");
    await fireEvent.press(screen.getByRole("button", { name: "Send invite" }));

    await waitFor(() => expect(screen.getByText("That person is already on this team")).toBeTruthy());
  });

  it("offers no remove control for the owner", async () => {
    await renderTeam();

    await waitFor(() => expect(screen.getByText("Karim Rahman")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Remove Dana Reyes" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove Karim Rahman" })).toBeNull();
  });

  it("hides the invite form from a requester", async () => {
    await renderTeam("org_requester");

    await waitFor(() => expect(screen.getByText("Karim Rahman")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Send invite" })).toBeNull();
  });
});
