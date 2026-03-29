/**
 * Pastita Dashboard — Service Worker
 *
 * Responsibilities:
 * 1. Cache static assets for offline resilience (cache-first for assets, network-first for API)
 * 2. Handle Web Push notifications from the server
 * 3. Handle notification click — focus existing tab or open new one
 */

const CACHE_NAME = 'pastita-dash-v1';

// Assets to pre-cache on install
const PRE_CACHE = ['/'];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch — network-first for /api/, cache-first for static assets ───────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API calls: network-first, no caching
  if (url.pathname.startsWith('/api/')) return;

  // SPA navigation requests (no file extension = React Router route):
  // serve index.html from cache so the app loads even offline / on hard refresh.
  const isNavigation = request.mode === 'navigate' || !url.pathname.includes('.');
  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets (js, css, images…): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
        }
        return response;
      });
    })
  );
});

// ─── Push ─────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = { title: 'Pastita', body: 'Nova notificação', data: {} };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: '/pastita-logo.svg',
    badge: '/pastita-logo.svg',
    tag: payload.tag || 'pastita-notification',
    data: payload.data || {},
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus existing tab if open
        for (const client of clients) {
          if (client.url === fullUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullUrl);
        }
      })
  );
});
