import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/**
 * Debounced autosave. Call `schedule(value)` on every edit; `save(value)` runs
 * once edits pause for `delayMs`. Pending work is flushed on unmount and when
 * the page is hidden, and the browser warns before closing the tab while a
 * save is outstanding.
 */
export function useAutosave<T>(save: (value: T) => Promise<void>, delayMs = 500) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const next = pending.current;
    if (!next) return;

    pending.current = null;
    setStatus('saving');

    try {
      await saveRef.current(next.value);
      setStatus(pending.current ? 'pending' : 'saved');
    } catch {
      setStatus('error');
    }
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      setStatus('pending');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delayMs);
    },
    [delayMs, flush],
  );

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pending.current) event.preventDefault();
    };

    // Mobile systems often kill a backgrounded app without `beforeunload`,
    // so save as soon as the page is hidden.
    const flushIfHidden = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const flushNow = () => void flush();

    window.addEventListener('beforeunload', warn);
    window.addEventListener('pagehide', flushNow);
    document.addEventListener('visibilitychange', flushIfHidden);
    return () => {
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('pagehide', flushNow);
      document.removeEventListener('visibilitychange', flushIfHidden);
      void flush();
    };
  }, [flush]);

  return { status, schedule, flush };
}
