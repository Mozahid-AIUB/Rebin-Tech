import { deleteOwnAccount } from "../auth";
import { supabase } from "../client";

describe("deleteOwnAccount", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("posts to delete-account with the session's access token", async () => {
    jest.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { access_token: "test-token" } as never },
      error: null,
    } as never);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await deleteOwnAccount();

    expect(global.fetch).toHaveBeenCalledWith(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );
  });

  it("throws the server's own message on failure", async () => {
    jest.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { access_token: "test-token" } as never },
      error: null,
    } as never);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Remove your platform access first" }),
    });

    await expect(deleteOwnAccount()).rejects.toThrow("Remove your platform access first");
  });

  it("throws when there is no session", async () => {
    jest.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);

    await expect(deleteOwnAccount()).rejects.toThrow("Not signed in");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
