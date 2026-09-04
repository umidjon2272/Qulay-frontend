const CACHE_NAME = "yechim-ai-static-v2";
const SHELL_URL = "/index.html";

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let data;
    try { data = event.data?.json(); } catch { return; }
    if (!data || typeof data.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.id) || typeof data.body !== 'string') return;
    const url = new URL(typeof data.url === 'string' ? data.url : '/', self.location.origin);
    if (url.origin !== self.location.origin) return;
    // Provider retries share a tag; do not create duplicate visible toasts.
    const tag = `qulay-${data.id}`;
    const receiptCache = await caches.open('qulay-push-receipts-v1');
    const receiptUrl = new URL(`/__push_receipts/${data.id}`, self.location.origin).href;
    if (await receiptCache.match(receiptUrl)) return;
    const existing = await self.registration.getNotifications({ tag });
    if (existing.length) return;
    await self.registration.showNotification('Qulay AI', { body: data.body, tag, renotify: false, data: { url: url.href } });
    await receiptCache.put(receiptUrl, new Response('delivered'));
    const receipts = await receiptCache.keys();
    await Promise.all(receipts.slice(0, Math.max(0, receipts.length - 500)).map(item => receiptCache.delete(item)));
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL(event.notification.data?.url ?? '/', self.location.origin);
    if (url.origin !== self.location.origin) return;
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = clients.find(item => new URL(item.url).origin === url.origin);
    if (client) { await client.navigate(url.href); await client.focus(); }
    else await self.clients.openWindow(url.href);
  })());
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(SHELL_URL))
      .catch(() => undefined),
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("yechim-ai-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (
    request.method !== "GET" ||
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Keep only the offline navigation fallback. Build assets are served directly
  // by Vercel/CDN so a previous service worker can never pin stale JS chunks.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() =>
        caches.match(SHELL_URL).then(
          (cachedShell) =>
            cachedShell ??
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
        ),
      ),
    );
  }
});
