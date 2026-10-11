var CACHE_PREFIX = "travel-handbook-";
var CACHE_NAME = CACHE_PREFIX + "__BUILD_VERSION__";
var LOCAL_ASSETS = [
  "./",
  "./index.html",
  "./trip.config.js",
  "./styles.css",
  "./app.js",
  "./travel-store.js",
  "./travel-manager.js",
  "./使用說明.html",
  "./map.js",
  "./weather.js",
  "./vendor/leaflet.css",
  "./vendor/leaflet.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(LOCAL_ASSETS); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME; }).map(function (key) { return caches.delete(key); }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(event.request).then(function (response) {
    if (response.ok) { var copy = response.clone(); caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); }); }
    return response;
  }).catch(function () {
    return caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      if (event.request.mode === "navigate") return caches.match("./index.html");
      return Response.error();
    });
  }));
});
