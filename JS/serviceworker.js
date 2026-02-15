const CACHE_NAME = "fsssmc-mosque-v4";

const ASSETS = [
  "/",
  "/home.html",
  "/prayer.html",

  "/manifest.json",

  "/CSS/prayer.css",

  "/JS/prayer.js",
  "/JS/qibla.js",
  "/JS/service-worker.js",

  "/AUDIO/adhan.mp3",

  "/IMAGE/FSSMC ICON.jpeg",
];

// INSTALL
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      ),
    ),
  );

  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    }),
  );
});
