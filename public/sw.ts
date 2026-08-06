/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Imagens públicas do R2 (avatars/fotos anexas públicas): CacheFirst 30 dias
registerRoute(
  ({ url }) => url.hostname.endsWith("r2.dev"),
  new CacheFirst({
    cacheName: "chameleon-r2-images",
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

// SPA: qualquer navegação cai no index.html quando offline (shell precacheado)
registerRoute(
  ({ request }) => request.mode === "navigate",
  async ({ event }) => {
    try {
      return await fetch(event.request);
    } catch {
      const cached = await caches.match("/index.html");
      return cached ?? Response.error();
    }
  },
);

// Background Sync: avisa os clientes abertos para drenar a fila offline
self.addEventListener("sync", (event: any) => {
  if (event.tag === "chameleon-sync") {
    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then(clients => clients.forEach(client => client.postMessage({ type: "chameleon:sync" }))),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
