import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useLoader } from "../src/hooks/useLoader";

describe("useLoader", () => {
  // The run is held open on purpose. RNTL 14's renderHook awaits act()
  // internally, so a resolved promise has already settled by the time it
  // returns and the loading state is never observable.
  it("runs on mount and reports when it is done", async () => {
    let finish: () => void = () => {};
    const run = jest.fn().mockImplementation(() => new Promise<void>((r) => { finish = r; }));

    const { result } = await renderHook(() => useLoader(run));

    expect(result.current.loading).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);

    await act(async () => { finish(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  // The point of the hook. Every screen used to replace its content with
  // "Loading…" on every refresh, so a reload after an action blanked a screen
  // the user was reading and made a 300ms request feel like a broken one.
  it("keeps showing content while it refreshes", async () => {
    let finish: () => void = () => {};
    const run = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(() => new Promise<void>((r) => { finish = r; }));

    const { result } = await renderHook(() => useLoader(run));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { result.current.reload(); });

    // Refreshing, but not "loading" -- there is something on screen to keep.
    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(true);

    await act(async () => { finish(); });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
  });

  it("surfaces a failure message and stops loading", async () => {
    const run = jest.fn().mockRejectedValue(new Error("Couldn't load your work."));

    const { result } = await renderHook(() => useLoader(run));

    await waitFor(() => expect(result.current.error).toBe("Couldn't load your work."));
    expect(result.current.loading).toBe(false);
  });

  // A first attempt that failed left nothing on screen, so the retry has to
  // show that something is happening rather than sitting on the error.
  it("goes back to loading when a retry follows a failed first attempt", async () => {
    let finish: () => void = () => {};
    const run = jest
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockImplementationOnce(() => new Promise<void>((r) => { finish = r; }));

    const { result } = await renderHook(() => useLoader(run));
    await waitFor(() => expect(result.current.error).toBe("network"));

    await act(async () => { result.current.reload(); });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    await act(async () => { finish(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("does not write state after the screen is gone", async () => {
    let finish: () => void = () => {};
    const run = jest.fn().mockImplementation(() => new Promise<void>((r) => { finish = r; }));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = await renderHook(() => useLoader(run));
    await unmount();
    await act(async () => { finish(); });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
