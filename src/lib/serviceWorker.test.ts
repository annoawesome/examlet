import { describe, expect, it, vi } from 'vitest';

import { watchForUpdates } from './serviceWorker';

/** A stand-in for a ServiceWorker that records the messages sent to it. */
function fakeWorker(state: ServiceWorkerState = 'installing') {
  return Object.assign(new EventTarget(), { state, postMessage: vi.fn() });
}

function setup({ controlled = true, waiting = null as ReturnType<typeof fakeWorker> | null } = {}) {
  const registration = Object.assign(new EventTarget(), {
    waiting,
    installing: null as ReturnType<typeof fakeWorker> | null,
    update: vi.fn(() => Promise.resolve()),
  });
  const container = Object.assign(new EventTarget(), { controller: controlled ? {} : null });
  const onUpdateReady = vi.fn<(apply: () => void) => void>();
  const reload = vi.fn();

  watchForUpdates(
    registration as unknown as ServiceWorkerRegistration,
    container as unknown as ServiceWorkerContainer,
    { onUpdateReady, reload },
  );

  /** Simulates the browser finding and installing a new worker. */
  const install = () => {
    const worker = fakeWorker();
    registration.installing = worker;
    registration.dispatchEvent(new Event('updatefound'));
    worker.state = 'installed';
    worker.dispatchEvent(new Event('statechange'));
    return worker;
  };

  return { registration, container, onUpdateReady, reload, install };
}

describe('watchForUpdates', () => {
  it('offers an update once a new worker has installed', () => {
    const { onUpdateReady, install } = setup();

    install();

    expect(onUpdateReady).toHaveBeenCalledOnce();
  });

  it('offers a worker that was already waiting at startup', () => {
    const waiting = fakeWorker('installed');
    const { onUpdateReady } = setup({ waiting });

    expect(onUpdateReady).toHaveBeenCalledOnce();
  });

  it('stays quiet on the first install, which needs no reload', () => {
    const { onUpdateReady, install } = setup({ controlled: false });

    install();

    expect(onUpdateReady).not.toHaveBeenCalled();
  });

  it('activates the waiting worker and reloads once it takes control', () => {
    const { container, onUpdateReady, reload, install } = setup();
    const worker = install();

    onUpdateReady.mock.calls[0]![0]();

    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reload).not.toHaveBeenCalled();

    container.dispatchEvent(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledOnce();
  });

  it('checks for updates when the app becomes visible again', () => {
    const { registration } = setup();

    document.dispatchEvent(new Event('visibilitychange'));

    expect(registration.update).toHaveBeenCalled();
  });
});
