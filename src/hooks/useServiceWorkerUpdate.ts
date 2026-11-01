import { useEffect, useState } from 'react';

import { registerServiceWorker } from '../lib/serviceWorker';

/**
 * Registers the service worker in production builds. Returns a function that
 * applies a waiting update, or null while there is none to apply.
 */
export function useServiceWorkerUpdate(enabled = import.meta.env.PROD) {
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;
    void registerServiceWorker({ onUpdateReady: (apply) => setApplyUpdate(() => apply) });
  }, [enabled]);

  return { applyUpdate, dismiss: () => setApplyUpdate(null) };
}
