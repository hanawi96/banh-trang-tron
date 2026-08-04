/* Bánh tráng cuộn PWA — bump SHELL_CACHE when shipping shell changes */
const SHELL_CACHE = "bt-shell-v70";
/** Images kept across shell bumps — avoid re-hitting R2 after every CSS/JS deploy */
const IMAGE_CACHE = "bt-images-v1";
const PRECACHE = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("bt-shell-") && k !== SHELL_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Instant from cache, refresh in background — keeps browser spinner short */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetching = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  if (cached) {
    fetching.catch(() => {});
    return cached;
  }
  return fetching;
}

async function cacheFirstNavigate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached =
    (await cache.match(request)) || (await cache.match("/index.html"));
  const fetching = fetch(request)
    .then((res) => {
      if (res && res.ok) {
        cache.put(request, res.clone());
        cache.put("/index.html", res.clone());
      }
    })
    .catch(() => cached);
  if (cached) {
    fetching.catch(() => {});
    return cached;
  }
  return fetching;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Không chặn blob/data (in phiếu) hay cross-origin
  if (url.protocol === "blob:" || url.protocol === "data:") return;
  if (url.origin !== self.location.origin) return;

  // API always network — never stale orders/stats
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.pathname.startsWith("/images/")) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(cacheFirstNavigate(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});
