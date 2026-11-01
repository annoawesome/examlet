/**
 * Examlet service worker. Precaches the whole build on install and serves it
 * cache-first, so the app opens and runs with no network.
 *
 * This is a template: pwa/serviceWorkerPlugin.ts replaces the two
 * placeholders below at build time and emits the result as dist/sw.js.
 */

/** Content hash of the precached files. A new value means a new version. */
const VERSION = __EXAMLET_VERSION__;
/** Build files, relative to the service worker's scope. */
const PRECACHE = __EXAMLET_PRECACHE__;

// Scoped so two Examlet deployments on one origin never delete each other's cache.
const CACHE_PREFIX = `examlet:${self.registration.scope}:`;
const CACHE = CACHE_PREFIX + VERSION;

const scoped = (path) => new URL(path, self.registration.scope).href;

/** The app shell is cached under the scope root, the URL navigations use. */
const APP_SHELL = scoped('./');

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(PRECACHE.map((path) => precache(cache, scoped(path))));

      // An update normally waits until the page asks for it, so a new version
      // never swaps in under a study session or an unsaved edit. With no
      // window open there is nothing to disrupt, so take over right away.
      const windows = await self.clients.matchAll({ type: 'window' });
      if (windows.length === 0) await self.skipWaiting();
    })(),
  );
});

async function precache(cache, url) {
  // `cache: 'reload'` skips the HTTP cache so a stale copy is never stored.
  const response = await fetch(new Request(url, { cache: 'reload' }));
  if (!response.ok) throw new Error(`Precaching ${url} failed with ${response.status}.`);
  await cache.put(url, response.redirected ? await withoutRedirect(response) : response);
}

/**
 * Many hosts redirect, e.g. /index.html → /. A response that went through a
 * redirect keeps a `redirected` flag, and browsers refuse such a response for
 * a navigation ("Response served by service worker has redirections"), so
 * store a fresh copy without the flag.
 */
async function withoutRedirect(response) {
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;

  // Routing is hash-based, so every navigation in scope is the app shell.
  const key = request.mode === 'navigate' ? APP_SHELL : request;
  event.respondWith(cacheFirst(key, request));
});

async function cacheFirst(key, request) {
  // `ignoreVary`: hosts may send `Vary: Origin`, and the browser adds an
  // Origin header to `crossorigin` script and style requests that the
  // precache requests lacked, so the cached copies would never match.
  const cached = await caches.match(key, { cacheName: CACHE, ignoreSearch: true, ignoreVary: true });
  return cached ?? fetch(request);
}
