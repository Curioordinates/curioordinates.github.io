/**
 * Service worker for the v2 map (scope /v2/): the same offline support the original map's /sw.js gives it.
 * Precaches the v2 shell, metadata, the images the pages use and every PNG marker (per metadata keys + you.png);
 * cell TSVs, OpenFreeMap tiles and Google Fonts are cached on first fetch. Everything is network-first, so online
 * visitors always get fresh files and the caches are only read when offline.
 *
 * Cache names deliberately do not start with "untamed-": /sw.js deletes every "untamed-" cache but its own.
 */
const CACHE_STATIC = "antique-v2-static-v1";
const CACHE_RUNTIME = "antique-v2-runtime-v1";
const CACHE_PREFIX = "antique-v2-";

// this worker's folder (/v2/) and the site root above it, where the shared data, markers and images live
function appBase() {
  return new URL(".", self.location.href).href;
}
function siteRoot() {
  return new URL("..", self.location.href).href;
}

function interceptKind(url) {
  const h = url.hostname;
  if (h === "tiles.openfreemap.org") {
    return "tile";
  }
  if (h === "fonts.googleapis.com" || h === "fonts.gstatic.com") {
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
    console.warn("[sw v2] cache put failed", requestUrl, e);
  }
}

async function safePrecacheUrl(cache, url) {
  try {
    const res = await fetch(url, { cache: "reload" });
    await safeCachePut(cache, url, res);
  } catch (e) {
    console.warn("[sw v2] precache skip", url, e);
  }
}

/**
 * Icons drawn for the pins (`../markers/<tag>.png`, plus `you.png` for follow mode).
 */
async function precacheMarkerPngs(cache, root) {
  const metaUrl = new URL("src/metadata.json", root).href;
  let metaRes = await cache.match(metaUrl);
  if (!metaRes) {
    try {
      metaRes = await fetch(metaUrl, { cache: "reload" });
    } catch (e) {
      console.warn("[sw v2] metadata unavailable for marker precache", e);
      return;
    }
  }
  if (!metaRes.ok) {
    return;
  }
  let meta;
  try {
    meta = await metaRes.json();
  } catch (e) {
    console.warn("[sw v2] metadata parse failed", e);
    return;
  }
  const names = new Set(Object.keys(meta));
  names.add("you");
  await Promise.all(
    [...names].map((key) =>
      safePrecacheUrl(cache, new URL(`markers/${key}.png`, root).href)
    )
  );
}

async function precacheApp() {
  const base = appBase();
  const root = siteRoot();
  const cache = await caches.open(CACHE_STATIC);

  const localPaths = [
    "index.html",
    "settings.html",
    "settings.js",
    "style.css",
    "maplibre-gl.js",
    "glyphs.js",
    "pins.js",
    "app.js",
  ];
  const sharedPaths = [
    "src/metadata.json",
    "images/support.png",
    "images/settings.png",
    "images/folder.svg",
    "images/google-maps.svg",
    "images/komoot.svg",
    "images/osm.svg",
    "images/wikimap.svg",
  ];

  await Promise.all([
    ...localPaths.map((p) => safePrecacheUrl(cache, new URL(p, base).href)),
    ...sharedPaths.map((p) => safePrecacheUrl(cache, new URL(p, root).href)),
  ]);

  await precacheMarkerPngs(cache, root);
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
      if (path.endsWith("/") || path.endsWith("/index.html")) {
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
            key.startsWith(CACHE_PREFIX) &&
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

  // the v2 pages' own files and the shared data, markers and images at the site root
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
