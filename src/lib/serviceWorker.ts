/**
 * Registers the offline service worker (pwa/sw.js, emitted at build time)
 * and reports when a new version is installed and waiting.
 */

export interface UpdateOptions {
  /** Called with a function that swaps in the waiting version and reloads. */
  onUpdateReady(applyUpdate: () => void): void;
  reload?: () => void;
}

export async function registerServiceWorker(
  options: UpdateOptions,
  container: ServiceWorkerContainer | undefined = navigator.serviceWorker,
): Promise<void> {
  if (!container) return;

  try {
    const registration = await container.register('./sw.js');
    watchForUpdates(registration, container, options);
  } catch {
    // Offline support is an enhancement: the app still works without it.
  }
}

export function watchForUpdates(
  registration: ServiceWorkerRegistration,
  container: ServiceWorkerContainer,
  { onUpdateReady, reload = () => window.location.reload() }: UpdateOptions,
): void {
  const offer = (worker: ServiceWorker) =>
    onUpdateReady(() => {
      container.addEventListener('controllerchange', () => reload(), { once: true });
      worker.postMessage({ type: 'SKIP_WAITING' });
    });

  // Without a controller this is the first install, which activates by itself.
  if (registration.waiting && container.controller) offer(registration.waiting);

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && container.controller) offer(worker);
    });
  });

  // An installed app can stay open for days, so check again whenever it returns.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registration.update().catch(() => {});
  });
}
