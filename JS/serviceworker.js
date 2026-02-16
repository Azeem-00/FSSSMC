const CACHE_NAME = "fsssmc-mosque-v6";

const STATIC_ASSETS = [
  "/",
  "/home.html",
  "/prayer.html",
  "/about.html",
  "/events.html",
  "/calendar.html",
  "/learn.html",
  "/involve.html",
  "/contact.html",

  "/manifest.json",
  "/CSS/prayer.css",
  "/JS/prayer.js",
  "/JS/qibla.js",
  "/JS/service-worker.js",
  "/AUDIO/adhan.mp3",
  "/IMAGE/FSSMC ICON.png",
];

const PRAYER_API_CACHE = "prayer-api-cache-v2";
const GEO_API_CACHE = "geo-api-cache-v2";

// INSTALL: cache static assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
});

// ACTIVATE: remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (
            key !== CACHE_NAME &&
            key !== PRAYER_API_CACHE &&
            key !== GEO_API_CACHE
          ) {
            return caches.delete(key);
          }
        }),
      ),
    ),
  );
  self.clients.claim();
});

// FETCH: serve cache first
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. Prayer times API
  if (requestUrl.hostname === "api.aladhan.com") {
    event.respondWith(
      caches.open(PRAYER_API_CACHE).then((cache) =>
        fetch(event.request)
          .then((response) => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => caches.match(event.request)),
      ),
    );
    return;
  }

  // 2. Reverse geocoding API
  if (requestUrl.hostname === "nominatim.openstreetmap.org") {
    event.respondWith(
      caches.open(GEO_API_CACHE).then((cache) =>
        fetch(event.request)
          .then((response) => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => caches.match(event.request)),
      ),
    );
    return;
  }

  // 3. Static assets (HTML, CSS, JS, images, audio)
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
});
