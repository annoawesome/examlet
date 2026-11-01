import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

/**
 * Runs `load` on mount and whenever `deps` change. Results from stale runs
 * are ignored. `reload` re-runs it without changing deps.
 */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  const run = useCallback(load, deps);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    run().then(
      (data) => !cancelled && setState({ status: 'success', data }),
      (error: unknown) =>
        !cancelled && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );

    return () => {
      cancelled = true;
    };
  }, [run, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return [state, reload] as const;
}
