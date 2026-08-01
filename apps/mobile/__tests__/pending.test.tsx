import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Pending from "../app/(auth)/pending";
import ContextPicker from "../app/(auth)/context-picker";
import { useSessionStore } from "../src/store/session";

const mockSignOut = jest.fn();
jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return { ...actual, signOut: (...a: unknown[]) => mockSignOut(...a) };
});

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn() }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue(undefined);
});

describe("S08 Pending", () => {
  it("tells an organization its verification is in review", async () => {
    useSessionStore.setState({
      status: "pending",
      userId: "u1",
      assignments: [{ role: "org_owner", scopeType: "organization", scopeId: "o1", scopeName: "Org A" }],
      activeIndex: 0,
    });
    await render(<Pending />);
    expect(screen.getByText("Verification in review")).toBeTruthy();
    expect(screen.getByText(/one business day/i)).toBeTruthy();
  });

  it("prompts a business to finish payout setup with a CTA", async () => {
    useSessionStore.setState({
      status: "pending",
      userId: "u2",
      assignments: [{ role: "biz_owner", scopeType: "business", scopeId: "b1", scopeName: "TechFix" }],
      activeIndex: 0,
    });
    await render(<Pending />);
    expect(screen.getByText("Finish your payout setup")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue setup" })).toBeTruthy();
  });

  it("falls back to a no-access message when the account has no role", async () => {
    useSessionStore.setState({ status: "pending", userId: "u3", assignments: [], activeIndex: 0 });
    await render(<Pending />);
    expect(screen.getByText("No portal access yet")).toBeTruthy();
    // Nothing to continue to -- offering a CTA here would lead nowhere.
    expect(screen.queryByRole("button", { name: "Continue setup" })).toBeNull();
  });

  it("always offers a log-out escape hatch", async () => {
    useSessionStore.setState({ status: "pending", userId: "u3", assignments: [], activeIndex: 0 });
    await render(<Pending />);
    expect(screen.getByRole("button", { name: "Log Out" })).toBeTruthy();
  });

  it("signs out, clears the store and returns to login", async () => {
    useSessionStore.setState({ status: "pending", userId: "u3", assignments: [], activeIndex: 0 });
    await render(<Pending />);
    await fireEvent.press(screen.getByRole("button", { name: "Log Out" }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(useSessionStore.getState().status).toBe("signed-out");
    expect(useSessionStore.getState().userId).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  // A failed server-side sign-out must not trap the user in the account.
  it("still clears local state when signOut rejects", async () => {
    mockSignOut.mockRejectedValue(new Error("offline"));
    useSessionStore.setState({ status: "pending", userId: "u4", assignments: [], activeIndex: 0 });
    await render(<Pending />);
    await fireEvent.press(screen.getByRole("button", { name: "Log Out" }));

    await waitFor(() => expect(useSessionStore.getState().status).toBe("signed-out"));
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});

describe("S09 Context Picker", () => {
  const twoAccounts = [
    { role: "org_owner" as const, scopeType: "organization" as const, scopeId: "o1", scopeName: "Riverside Medical" },
    { role: "biz_owner" as const, scopeType: "business" as const, scopeId: "b1", scopeName: "TechFix Repairs" },
  ];

  it("lists every assignment with its scope name and role label", async () => {
    useSessionStore.setState({ status: "ready", userId: "u1", assignments: twoAccounts, activeIndex: 0 });
    await render(<ContextPicker />);
    expect(screen.getByText("Riverside Medical")).toBeTruthy();
    expect(screen.getByText("TechFix Repairs")).toBeTruthy();
  });

  it("sets the chosen assignment active before routing to its portal", async () => {
    useSessionStore.setState({ status: "ready", userId: "u1", assignments: twoAccounts, activeIndex: 0 });
    await render(<ContextPicker />);
    await fireEvent.press(screen.getByLabelText("TechFix Repairs, Owner"));

    // Order matters: RoleGuard on the destination reads activeIndex, so a
    // stale value would bounce the user straight back out.
    expect(useSessionStore.getState().activeIndex).toBe(1);
    expect(mockReplace).toHaveBeenCalledWith("/(biz)/dashboard");
  });

  it("skips platform roles, which have no mobile portal", async () => {
    useSessionStore.setState({
      status: "ready",
      userId: "u1",
      assignments: [
        { role: "platform_ops", scopeType: "platform", scopeId: null, scopeName: null },
        ...twoAccounts,
      ],
      activeIndex: 0,
    });
    await render(<ContextPicker />);
    expect(screen.queryByLabelText(/platform_ops/)).toBeNull();
    expect(screen.getByText("Riverside Medical")).toBeTruthy();
  });
});
