/**
 * Service worker for the v2 map (scope /v2/): the same offline support the original map's /sw.js gives it.
 * Precaches the v2 shell, metadata, the images the pages use and every PNG marker (per metadata keys + you.png);
 * cell TSVs, OpenFreeMap tiles and Google Fonts are cached on first fetch. Everything is network-first, so online
 * visitors always get fresh files and the caches are only read when offline, except the OpenFreeMap tiles (see
 * tileResponse): those are read from the cache first so a returning visitor's opening view draws without waiting.
 *
 * Cache names deliberately do not start with "untamed-": /sw.js deletes every "untamed-" cache but its own.
 */
const CACHE_STATIC = "antique-v2-static-v1";
// OpenFreeMap tiles; the earlier "antique-v2-runtime-v1" tile cache is deleted at activation like any other old cache
const CACHE_TILES = "antique-v2-tiles-v1";
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
    "timezone-location.js",
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

// GitHub Pages lets browsers reuse files for 10 minutes without asking, so a plain fetch here can mix a new page
// with old scripts after a deploy. The site's own files are therefore always revalidated with the server (cheap:
// unchanged files come back as 304s). The redirect mode is kept so page navigations still follow redirects safely.
const fresh = (request) =>
  new Request(request.url, {
    cache: "no-cache",
    redirect: request.redirect,
    credentials: request.credentials,
  });

async function networkFirstWithCache(request, cacheName, revalidate = false) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(revalidate ? fresh(request) : request);
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

/* OpenFreeMap tiles. The index (/planet) names the current build, and every tile URL carries that build in its path
   (/planet/20261122_124456_pt/{z}/{x}/{y}.pbf), so a tile URL's contents never change: tiles are served from the cache
   when there, and fetched and stored when not. The index does change, about weekly: a cached copy is served straight
   away while a fresh one is fetched for next time, unless the cached copy is over TILE_INDEX_MAX_AGE old (the old
   build may be gone by then), in which case the fresh one is waited for. When the build changes, the old build's
   tiles are deleted, so the cache only ever holds tiles of one build. Offline, whatever is cached is used. */
const TILE_INDEX_MAX_AGE = 3 * 24 * 3600 * 1000;
const tileBuild = (url) => (new URL(url).pathname.match(/^\/planet\/([^/]+)\//) || [])[1];

async function dropOtherBuilds(cache, index) {
  let build;
  try {
    build = tileBuild((await index.clone().json()).tiles[0]);
  } catch (e) {
    return;
  }
  if (!build) {
    return;
  }
  const keys = await cache.keys();
  await Promise.all(
    keys.map((req) => {
      const b = tileBuild(req.url);
      return b && b !== build ? cache.delete(req) : Promise.resolve();
    })
  );
}

async function tileResponse(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_TILES);
  const cached = await cache.match(request);
  const isIndex = !tileBuild(request.url);
  if (!isIndex) {
    if (cached) {
      return cached;
    }
    const response = await fetch(request);
    await safeCachePut(cache, request.url, response);
    return response;
  }
  // the index: refresh it in the background, and tidy away the old build's tiles once a new one is stored
  // (a cross-origin response's Date header cannot be read, so the copy is stamped with when it was stored)
  const refresh = fetch(request).then(async (response) => {
    if (response.ok) {
      const body = await response.clone().arrayBuffer();
      const headers = new Headers(response.headers);
      headers.set("x-stored-at", String(Date.now()));
      await safeCachePut(cache, request.url, new Response(body, { status: response.status, headers }));
      await dropOtherBuilds(cache, response);
    }
    return response;
  });
  const age = cached ? Date.now() - Number(cached.headers.get("x-stored-at")) : Infinity;
  if (cached && age < TILE_INDEX_MAX_AGE) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  try {
    return await refresh;
  } catch (err) {
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
            key !== CACHE_TILES
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
    event.respondWith(networkFirstWithCache(request, CACHE_STATIC, true));
    return;
  }

  const kind = interceptKind(url);
  if (kind === "cdn") {
    event.respondWith(networkFirstWithCache(request, CACHE_STATIC));
    return;
  }
  if (kind === "tile") {
    event.respondWith(tileResponse(event));
  }
});
