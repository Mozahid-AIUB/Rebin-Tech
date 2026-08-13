import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs a screen's fetch on mount and on demand.
 *
 * Every list screen had grown the same twenty lines: a `loading` flag, an
 * `error` string, a try/catch/finally, and a `useEffect` to kick it off. Aside
 * from the duplication, they all shared one behaviour worth changing.
 *
 * They set `loading` on *every* run, and rendered `loading ? "Loading…" :
 * content`. So refreshing after an action -- claiming a job, saving a profile
 * -- wiped the screen the user was reading and rebuilt it. A 300ms request
 * that blanks the page reads as a much slower one than a 2s request that
 * leaves the page alone; the delay people complain about is usually this
 * rather than the network.
 *
 * So `loading` means "there is nothing to show yet" and is true only until the
 * first success. Later runs raise `refreshing` instead, and the screen keeps
 * what it has. A retry after a failed first attempt goes back to `loading`,
 * because in that case there genuinely is nothing behind the spinner.
 *
 * `run` is expected to be a `useCallback` -- it is the effect's dependency, so
 * an inline function would refetch on every render.
 */
export function useLoader(run: () => Promise<void>): {
  /** Nothing to show yet. Render the empty/loading state. */
  loading: boolean;
  /** A run is in flight. Content, if any, is stale but still worth showing. */
  refreshing: boolean;
  error: string | null;
  reload: () => void;
} {
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Not state: a late resolution after unmount would otherwise set state on a
  // gone component, and React logs that as an error in tests.
  const alive = useRef(true);

  const execute = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await run();
      if (!alive.current) return;
      setLoaded(true);
    } catch (e) {
      if (!alive.current) return;
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      if (alive.current) setRefreshing(false);
    }
  }, [run]);

  useEffect(() => {
    alive.current = true;
    void execute();
    return () => {
      alive.current = false;
    };
  }, [execute]);

  return {
    loading: !loaded && refreshing,
    refreshing,
    error,
    reload: () => void execute(),
  };
}
