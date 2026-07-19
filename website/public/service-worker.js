const CACHE_NAME = "darkloot-shell-20260719-6";
const SHELL = [
  "/",
  "/src/app.css?v=20260719-6",
  "/src/main.js?v=20260719-6",
  "/src/config.js",
  "/src/core.js",
  "/src/router.js",
  "/src/state.js",
  "/assets/darkloot-mark.png?v=20260719-2",
  "/assets/favicon.png?v=20260719-2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/data/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && (url.pathname.startsWith("/src/") || url.pathname.startsWith("/assets/"))) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
