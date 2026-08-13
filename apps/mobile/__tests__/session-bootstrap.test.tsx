import { renderHook, waitFor } from "@testing-library/react-native";
import { useSessionStore } from "../src/store/session";
import { useSessionBootstrap } from "../src/hooks/useSessionBootstrap";

// Captures the callback the hook hands to onAuthStateChange so each test can
// drive an auth transition directly, the way Supabase would.
let authCallback: ((event: string, session: unknown) => void) | null = null;
const mockUnsubscribe = jest.fn();
const mockResolveRoles = jest.fn();

jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return {
    ...actual,
    resolveRoles: (...a: unknown[]) => mockResolveRoles(...a),
    supabase: {
      auth: {
        onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
          authCallback = cb;
          return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
        },
      },
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  authCallback = null;
  useSessionStore.setState({ status: "loading", userId: null, assignments: [], activeIndex: 0 });
});

const ORG_ROLE = [
  { role: "org_owner" as const, scopeType: "organization" as const, scopeId: "o1", scopeName: "Riverside Medical" },
];

// The bug this covers: the store sat at "loading" until the login form ran,
// so a restored Supabase session was ignored and every cold start demanded a
// fresh login.
describe("session bootstrap", () => {
  it("hydrates the store from a session restored on boot", async () => {
    mockResolveRoles.mockResolvedValue(ORG_ROLE);
    await renderHook(() => useSessionBootstrap());

    authCallback!("INITIAL_SESSION", { user: { id: "u1" } });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("ready"));
    expect(useSessionStore.getState().userId).toBe("u1");
    expect(useSessionStore.getState().assignments).toEqual(ORG_ROLE);
  });

  // The auth session already carries the email and, for a social sign-in, the
  // profile picture. Me was calling supabase.auth.getUser() for both, which is
  // a network round trip for something already in hand.
  it("keeps the email and social avatar off the restored session", async () => {
    mockResolveRoles.mockResolvedValue(ORG_ROLE);
    await renderHook(() => useSessionBootstrap());

    authCallback!("INITIAL_SESSION", {
      user: {
        id: "u1",
        email: "ops@riverside.example",
        user_metadata: { avatar_url: "https://cdn.example/u1.jpg" },
      },
    });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("ready"));
    expect(useSessionStore.getState().email).toBe("ops@riverside.example");
    expect(useSessionStore.getState().oauthAvatarUrl).toBe("https://cdn.example/u1.jpg");
  });

  // Google sends `picture`, most other providers are normalised to
  // `avatar_url`, and Apple sends neither -- it never shares a photo.
  it("accepts Google's `picture` and tolerates a provider that sends no photo", async () => {
    mockResolveRoles.mockResolvedValue(ORG_ROLE);
    await renderHook(() => useSessionBootstrap());

    authCallback!("SIGNED_IN", {
      user: { id: "u1", email: "a@b.co", user_metadata: { picture: "https://g/p.jpg" } },
    });
    await waitFor(() => expect(useSessionStore.getState().oauthAvatarUrl).toBe("https://g/p.jpg"));

    authCallback!("SIGNED_IN", { user: { id: "u2", email: "c@d.co", user_metadata: {} } });
    await waitFor(() => expect(useSessionStore.getState().userId).toBe("u2"));
    expect(useSessionStore.getState().oauthAvatarUrl).toBeNull();
  });

  it("clears the email on sign-out", async () => {
    mockResolveRoles.mockResolvedValue(ORG_ROLE);
    await renderHook(() => useSessionBootstrap());
    authCallback!("INITIAL_SESSION", { user: { id: "u1", email: "ops@riverside.example" } });
    await waitFor(() => expect(useSessionStore.getState().email).toBe("ops@riverside.example"));

    authCallback!("SIGNED_OUT", null);

    await waitFor(() => expect(useSessionStore.getState().status).toBe("signed-out"));
    expect(useSessionStore.getState().email).toBeNull();
  });

  it("marks an account with no roles as pending, not ready", async () => {
    mockResolveRoles.mockResolvedValue([]);
    await renderHook(() => useSessionBootstrap());

    authCallback!("INITIAL_SESSION", { user: { id: "u2" } });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("pending"));
  });

  it("signs out when there is no restored session", async () => {
    await renderHook(() => useSessionBootstrap());

    authCallback!("INITIAL_SESSION", null);

    await waitFor(() => expect(useSessionStore.getState().status).toBe("signed-out"));
    expect(mockResolveRoles).not.toHaveBeenCalled();
  });

  it("signs out rather than hanging on 'loading' when roles fail to load", async () => {
    mockResolveRoles.mockRejectedValue(new Error("network"));
    await renderHook(() => useSessionBootstrap());

    authCallback!("INITIAL_SESSION", { user: { id: "u3" } });

    await waitFor(() => expect(useSessionStore.getState().status).toBe("signed-out"));
  });

  it("ignores a slow role lookup superseded by a newer auth event", async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    mockResolveRoles
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce(ORG_ROLE);

    await renderHook(() => useSessionBootstrap());

    authCallback!("INITIAL_SESSION", { user: { id: "stale" } });
    authCallback!("SIGNED_IN", { user: { id: "u1" } });
    await waitFor(() => expect(useSessionStore.getState().userId).toBe("u1"));

    // The first lookup lands late; it must not overwrite the newer session.
    resolveFirst([]);
    await waitFor(() => expect(useSessionStore.getState().userId).toBe("u1"));
    expect(useSessionStore.getState().status).toBe("ready");
  });

  it("unsubscribes on unmount", async () => {
    const { unmount } = await renderHook(() => useSessionBootstrap());
    // Awaited for the same reason as render/fireEvent across this repo's
    // suites: RNTL 14 wraps these in act() internally and returns a promise.
    await unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
