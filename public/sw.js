/* Self-destructing service worker.
 *
 * Earlier releases shipped a Workbox PWA worker. It precached the SPA shell,
 * so browsers that installed it could keep serving an old build after the
 * storefront became online-only. This worker takes over the same scope, drops
 * every cache, unregisters itself, and reloads the open clients so the live
 * app is always used. It never intercepts fetches.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      await Promise.allSettled(clients.map((client) => client.navigate(client.url)));
    })()
  );
});
