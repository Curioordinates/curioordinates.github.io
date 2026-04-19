/**
 * Service worker: offline support for the static map site.
 * Precaches shell, CDN deps, and metadata; cell TSVs and markers are cached on first fetch.
 */

const CACHE_STATIC = "untamed-static-v1";
const CACHE_RUNTIME = "untamed-runtime-v1";

const CDN_ASSETS = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/leaflet.vectorgrid@latest/dist/Leaflet.VectorGrid.bundled.js",
  "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css",
  "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css",
  "https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js",
  "https://gc.zgo.at/count.js",
];

function appBase() {
  return new URL(".", self.location.href).href;
}

function interceptKind(url) {
  const h = url.hostname;
  if (h.includes("basemaps.cartocdn.com") || h.includes("arcgisonline.com")) {
    return "tile";
  }
  if (h.endsWith("unpkg.com") || h === "gc.zgo.at") {
    return "cdn";
  }
  return null;
}

async function safeCachePut(cache, requestUrl, response) {
  try {
    if (response.ok) {
      await cache.put(requestUrl, response.clone());
    }
  } catch (e) {
    console.warn("[sw] cache put failed", requestUrl, e);
  }
}

async function safePrecacheUrl(cache, url) {
  try {
    const res = await fetch(url, { cache: "reload" });
    await safeCachePut(cache, url, res);
  } catch (e) {
    console.warn("[sw] precache skip", url, e);
  }
}

async function precacheApp() {
  const base = appBase();
  const cache = await caches.open(CACHE_STATIC);

  const localPaths = [
    "index.html",
    "settings.html",
    "script.js",
    "settings.js",
    "stylesheet.css",
    "images/kofi_s_logo_nolabel.png",
    "images/settings.png",
    "images/folder.svg",
    "images/google-maps.svg",
    "images/komoot.svg",
    "images/osm.svg",
    "images/wikimap.svg",
    "src/metadata.json",
  ];

  await Promise.all([
    ...localPaths.map((p) => safePrecacheUrl(cache, new URL(p, base).href)),
    ...CDN_ASSETS.map((u) => safePrecacheUrl(cache, u)),
  ]);
}

async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    await safeCachePut(cache, request.url, response);
    return response;
  } catch (err) {
    let cached = await cache.match(request);
    if (!cached) {
      cached = await cache.match(request, { ignoreSearch: true });
    }
    if (!cached && request.mode === "navigate") {
      const path = new URL(request.url).pathname;
      const base = appBase();
      if (path === "/" || path.endsWith("/index.html")) {
        cached = await cache.match(new URL("index.html", base).href);
      } else if (path.endsWith("/settings.html")) {
        cached = await cache.match(new URL("settings.html", base).href);
      }
    }
    if (cached) {
      return cached;
    }
    throw err;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheApp().then(() => {
      self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (
            key.startsWith("untamed-") &&
            key !== CACHE_STATIC &&
            key !== CACHE_RUNTIME
          ) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirstWithCache(request, CACHE_STATIC));
    return;
  }

  const kind = interceptKind(url);
  if (kind === "cdn") {
    event.respondWith(networkFirstWithCache(request, CACHE_STATIC));
    return;
  }
  if (kind === "tile") {
    event.respondWith(networkFirstWithCache(request, CACHE_RUNTIME));
  }
});
