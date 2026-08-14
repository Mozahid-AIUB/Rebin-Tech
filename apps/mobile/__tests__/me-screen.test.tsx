import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import { MeScreen } from "../src/features/portal/MeScreen";
import { useSessionStore } from "../src/store/session";

const mockProfile = jest.fn();
const mockOrgDetail = jest.fn();
const mockAgentDetail = jest.fn();
const mockUpdate = jest.fn();
const mockSignOut = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return {
    ...actual,
    getProfileDetail: (...a: unknown[]) => mockProfile(...a),
    getOrganizationDetail: (...a: unknown[]) => mockOrgDetail(...a),
    getAgentDetail: (...a: unknown[]) => mockAgentDetail(...a),
    updateOwnProfile: (...a: unknown[]) => mockUpdate(...a),
    signOut: (...a: unknown[]) => mockSignOut(...a),
    supabase: { auth: { getUser: () => mockGetUser() } },
  };
});

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockProfile.mockResolvedValue({
    fullName: "Karim Rahman",
    phone: "5550192345",
    avatarUrl: null,
    status: "active",
  });
  mockUpdate.mockResolvedValue(undefined);
  mockOrgDetail.mockResolvedValue({
    id: "o1",
    name: "Riverside Medical Center",
    status: "active",
    orgType: "hospital",
    address: { street: "480 Riverside Drive", city: "Newark", state: "NJ", zip: "07102" },
    dockAccess: true,
  });
  mockSignOut.mockResolvedValue(undefined);
  useSessionStore.setState({
    status: "ready",
    userId: "u1",
    email: "karim.rahman@riversidemedical.org",
    oauthAvatarUrl: null,
    assignments: [{ role: "org_owner", scopeType: "organization", scopeId: "o1", scopeName: "Riverside Medical Center" }],
    activeIndex: 0,
  });
});

function renderMe() {
  return render(
    <PortalThemeProvider portal="org">
      <MeScreen />
    </PortalThemeProvider>,
  );
}

// Shared by all three portals, so this suite is the single place the account
// summary and the app's only exit are pinned.
describe("S71 Me", () => {
  it("shows the signed-in user's name and email", async () => {
    await renderMe();
    // Twice on purpose: the header card, then again in the Contact block that
    // mirrors the signup form.
    await waitFor(() => expect(screen.getAllByText("Karim Rahman")).toHaveLength(2));
    expect(screen.getAllByText("karim.rahman@riversidemedical.org")).toHaveLength(2);
  });

  // Me was calling supabase.auth.getUser() purely to read an email that the
  // sign-in session had already handed over -- a network round trip on every
  // visit for a string sitting in memory.
  it("reads the email from the session rather than asking the server", async () => {
    await renderMe();

    await waitFor(() =>
      expect(screen.getAllByText("karim.rahman@riversidemedical.org")).toHaveLength(2),
    );
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  // The organization read depends on the active role, which is known before
  // any request goes out -- so it has no reason to queue behind the profile.
  // Waiting made two round trips out of one.
  it("loads the organization without waiting for the profile", async () => {
    let resolveProfile: (v: unknown) => void = () => {};
    mockProfile.mockImplementation(() => new Promise((r) => { resolveProfile = r; }));

    await renderMe();

    await waitFor(() => expect(mockOrgDetail).toHaveBeenCalledWith("o1"));
    resolveProfile({ fullName: "Karim Rahman", phone: "5550192345", avatarUrl: null, status: "active" });
  });

  it("shows every organization detail captured at registration", async () => {
    await renderMe();
    await waitFor(() => expect(screen.getByText("Riverside Medical Center")).toBeTruthy());
    expect(screen.getByText("(555) 019-2345")).toBeTruthy();
    // Enum values are shown as the label the user actually picked.
    expect(screen.getByText("Hospital / Clinic")).toBeTruthy();
    expect(screen.getByText("480 Riverside Drive\nNewark, NJ 07102")).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
  });

  it("shows an agent their service area and vehicle instead of an organization", async () => {
    useSessionStore.setState({
      status: "ready",
      userId: "u2",
      email: "agent@rebin.test",
      oauthAvatarUrl: null,
      assignments: [{ role: "field_agent", scopeType: "self", scopeId: null, scopeName: null }],
      activeIndex: 0,
    });
    mockAgentDetail.mockResolvedValue({
      serviceCity: "Newark",
      serviceState: "NJ",
      serviceZip: "07102",
      vehicle: "van",
      hasDriversLicense: true,
    });

    await renderMe();
    await waitFor(() => expect(screen.getByText("Newark, NJ 07102")).toBeTruthy());
    expect(screen.getByText("Van")).toBeTruthy();
    expect(mockOrgDetail).not.toHaveBeenCalled();
  });

  it("signs out, clears the store and returns to login", async () => {
    await renderMe();
    await waitFor(() => expect(screen.getByText("Hospital / Clinic")).toBeTruthy());
    await fireEvent.press(screen.getByRole("button", { name: "Log Out" }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(useSessionStore.getState().status).toBe("signed-out");
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  // Signing out is a network call. The hook has tracked `pending` since it was
  // written and nothing ever rendered it, so a slow or offline sign-out looked
  // like a button that did nothing -- and the natural response to that is to
  // press it again.
  it("says it is working while the sign-out is in flight", async () => {
    let finish: () => void = () => {};
    mockSignOut.mockImplementation(() => new Promise<void>((r) => { finish = r; }));
    await renderMe();
    await waitFor(() => expect(screen.getByText("Hospital / Clinic")).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Log Out" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Log Out" }).props.accessibilityState.busy).toBe(true),
    );
    expect(screen.getByText("Signing out…")).toBeTruthy();

    finish();
  });

  it("cannot be pressed twice while it is signing out", async () => {
    let finish: () => void = () => {};
    mockSignOut.mockImplementation(() => new Promise<void>((r) => { finish = r; }));
    await renderMe();
    await waitFor(() => expect(screen.getByText("Hospital / Clinic")).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Log Out" }));
    await fireEvent.press(screen.getByRole("button", { name: "Log Out" }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    finish();
  });

  it("falls back to initials when no avatar has been provided", async () => {
    await renderMe();
    // Password signups have no provider photo, so this is the normal state --
    // designed, not a placeholder.
    await waitFor(() => expect(screen.getByLabelText("Profile initials KR")).toBeTruthy());
    expect(screen.queryByLabelText("Profile picture")).toBeNull();
  });

  it("prefers the stored avatar over the OAuth one", async () => {
    mockProfile.mockResolvedValue({
      fullName: "Karim Rahman",
      phone: "5550192345",
      avatarUrl: "https://cdn.test/stored.png",
      status: "active",
    });
    useSessionStore.setState({ oauthAvatarUrl: "https://cdn.test/google.png" });

    await renderMe();
    await waitFor(() => expect(screen.getByLabelText("Profile picture")).toBeTruthy());
    expect(screen.getByLabelText("Profile picture").props.source).toEqual({
      uri: "https://cdn.test/stored.png",
    });
  });

  it("uses the Google photo when the profile has no avatar of its own", async () => {
    useSessionStore.setState({ oauthAvatarUrl: "https://cdn.test/google.png" });

    await renderMe();
    await waitFor(() =>
      expect(screen.getByLabelText("Profile picture").props.source).toEqual({
        uri: "https://cdn.test/google.png",
      }),
    );
  });

  it("saves an edited name and phone, then reloads", async () => {
    await renderMe();
    await waitFor(() => expect(screen.getByText("Hospital / Clinic")).toBeTruthy());

    await fireEvent.press(screen.getByLabelText("Edit profile"));
    await fireEvent.changeText(screen.getByLabelText("Full name"), "Karim R Rahman");
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({ fullName: "Karim R Rahman", phone: "5550192345" }),
    );
    // Reloaded so the card reflects what was just saved.
    expect(mockProfile).toHaveBeenCalledTimes(2);
  });

  it("rejects an empty name without calling the server", async () => {
    await renderMe();
    await waitFor(() => expect(screen.getByText("Hospital / Clinic")).toBeTruthy());

    await fireEvent.press(screen.getByLabelText("Edit profile"));
    await fireEvent.changeText(screen.getByLabelText("Full name"), " ");
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(screen.getAllByText("Full name is required").length).toBeGreaterThan(0));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // The exit must work even when the profile read fails -- it's the whole
  // reason this screen is reachable from every portal.
  it("still renders the log-out control when the name lookup fails", async () => {
    mockProfile.mockRejectedValue(new Error("network"));
    await renderMe();
    await waitFor(() => expect(screen.getByRole("button", { name: "Log Out" })).toBeTruthy());
  });
});
