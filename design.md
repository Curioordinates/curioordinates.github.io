# Map design — Untamed Earth

This document describes how the interactive map in this static site works: which files participate, how data flows from disk to the map, and how URLs and settings choose what to show.

## Overview

The map is a full-page [Leaflet](https://leafletjs.com/) instance (`L.map("map")`) that:

1. Loads **dataset definitions** from `src/metadata.json`.
2. Decides which **marker categories** (tags) to load using the URL query string, `localStorage`, and per-dataset `implicit` flags.
3. Fetches one **tab-separated** file per selected tag from `data/cells/<tag>.tsv` and adds **point markers** with popups.
4. Renders markers inside a **cluster layer** (unless clustering is disabled via the URL) and a **raster tile basemap** (Carto light or Esri satellite).

Supporting pages: `index.html` is the map; `settings.html` + `settings.js` let users persist which categories are shown or hidden.

## Front-end stack (from `index.html`)

- **Leaflet 1.9** — map, markers, tile layer, popups.
- **Leaflet.MarkerCluster** — groups nearby markers into clusters until zoomed in.
- **Leaflet.VectorGrid** is included in `index.html` but **not used** by `script.js` (likely reserved or leftover).

Analytics: GoatCounter is loaded via `count.js`.

## Offline support (`sw.js`)

A **service worker** (not a Web Worker) registers from `index.html` and `settings.html` as `./sw.js` with scope `./`.

**Install (`install` event)** precaches into `untamed-static-v2` (bump the name in `sw.js` when you need to invalidate cached shell assets):

- Core pages and assets: `index.html`, `settings.html`, `script.js`, `settings.js`, `stylesheet.css`, popup/link images under `images/`, and `src/metadata.json`.
- Third-party scripts and styles used by the map: Leaflet, Leaflet.VectorGrid, Leaflet.MarkerCluster, and `https://gc.zgo.at/count.js` (GoatCounter).
- **`markers/<tag>.png`** for every key in `metadata.json`, plus **`markers/you.png`** (used in follow mode). Missing files are skipped without failing install. SVGs under `markers/` are source assets; the running app uses the PNGs, matching `getMarker()` in `script.js`.

**`data/cells/*.tsv`** is **not** bulk-downloaded at install. Each TSV is **cached the first time** the app requests it (same network-first + store pattern as other same-origin assets), so growth in cell files does not slow or bloat install.

**Runtime cache** `untamed-runtime-v1` stores **map tiles** (Carto basemaps and Esri satellite hosts) as you pan and zoom: **network first**, then cache, so previously viewed areas can still draw offline.

**Fetch handling**: Same-origin requests and the CDN hosts above use **network-first with cache fallback**; tile hosts use the runtime cache. Offline **navigation** falls back to cached `index.html` or `settings.html` when the exact URL (e.g. with `?l=…`) is not in cache.

**Activation**: Old caches named `untamed-*` from prior versions are deleted; `skipWaiting` + `clients.claim()` apply updates promptly.

**Limitations**: First offline visit requires at least one successful online load so the install precache can run. **Layers** you have not loaded while online will not be available offline until fetched. The **basemap** offline is limited to **tiles already fetched**. External links in popups (Google Maps, Komoot, etc.) need network. Geolocation still requires user permission and may not work without connectivity depending on device.

## Bootstrap sequence (`script.js`)

1. **`setup()`** runs on `body` load. It `fetch`es `./src/metadata.json` into a global `metadata` object, then calls **`mapSetup()`**.
2. **`mapSetup()`** parses the URL (`parseLocation()`), computes **`tagsToLoad`**, creates the map, layers, and loads TSVs for each tag.

There is no build step: the browser loads plain HTML and JS and fetches JSON/TSV at runtime.

## `src/metadata.json` — the dataset catalog

`metadata.json` is a single JSON object whose **keys are tag names** (e.g. `"fairy"`, `"stone-circle"`). Each value is metadata for that category. Common fields:

| Field | Role |
| --- | --- |
| `count` | Record count (informational; used for catalog/awareness, not enforced at runtime). |
| `implicit` | If **`false`**, this category is **opt-in**: it is not auto-added for users who rely only on defaults/new-tag behavior. If omitted or `true`, the category behaves as **on by default** when settings are empty or when new tags are merged in. **`world-heritage`** sets `"implicit": true` explicitly; most entries omit it and behave as implicit-on. |
| `typeLabel` | Overrides the category title shown in the popup header (default: the tag string). |
| `short_description` | Optional HTML block shown in the popup (below the main text, above the external links). |
| `".<>"`, `"<>"`, `"<>.\"` | Customize how the “more info” link is wrapped (prefix, anchor text, suffix). Used for special cases like `e-book` or `scratch-dial`. |
| `name_all` | Present on some entries (e.g. `redwood`); not referenced in `script.js` (may be for other tooling). |
| `link` | Present on some entries (e.g. `wayside-cross`); popup link behavior is driven by **per-row** TSV links, not this field, in the current `script.js`. |

The set of **keys in `metadata.json`** is the authoritative list of categories the map **knows how to load**. Extra `.tsv` files under `data/cells/` that do not correspond to a metadata key are **never fetched** by the main map logic.

## `data/cells/*.tsv` — point data

Each active tag loads **`./data/cells/<tag>.tsv`** via `loadTsv(tag, add)`.

**Column layout** (tab-separated, one row per place):

| Index | Field | Use |
| --- | --- | --- |
| 0 | Latitude | `Number` → marker position. |
| 1 | Longitude | `Number` → marker position. |
| 2 | Name | Primary title in the popup. |
| 3 | Link | URL for “more info”; `-` or `/` means no link. |
| 4 | Details | Optional longer HTML/text; shown in `.pop-details`. |
| 5 | Tags | Optional; if it includes `#attrib`, link styling uses the host name from the URL (`hostNameFromLink`). |

Rows are processed line-by-line; empty lines would still be split and could produce invalid markers—data is assumed to be clean. The marker icon is **`./markers/<tag>.png`** (cached per tag in `markers`).

## Popups (`add()` in `script.js`)

Each marker gets a Leaflet popup with:

- Category label (`typeLabel` or tag name) and folder icon.
- Title and optional details / link line (link placement depends on whether details exist).
- Optional `short_description` from metadata.
- A row of **external actions**: Google Maps, Komoot, OpenStreetMap, Wikimap, plus a **mailto** feedback link seeded with type, name, and coordinates.

Tags in field 5 enable the `#attrib` link presentation variant.

## Which categories load (`tagsToLoad`)

Priority and rules:

1. **URL “tag hints”** — The full URL is lowercased; if any **metadata key** appears as a substring of the URL, those keys are collected as `tagsPresentInUrl`. (This is substring matching, not a structured query parameter.)
2. If any such tags exist, they **override** saved settings: `requestedTags = tagsPresentInUrl`.
3. Otherwise, `requestedTags` comes from **`localStorage`** `settings.show` (or legacy `settings.enabled`).
4. If `requestedTags` is still empty, **all metadata keys** are considered (`allTags`), so the default is “everything the app knows about,” subject to the next steps.
5. **Merge implicit / new tags** — If the URL did **not** supply tag hints, then for each metadata key: if it is not hidden, not already in `tagsToLoad`, and `implicit !== false`, it is appended so **new categories** appear for existing users without wiping their `hide` list.
6. **Loading gate** — For each tag in `tagsToLoad`, a TSV is loaded only if:
   - `metadata[tag]` exists, and  
   - `implicit !== false` **or** the tag is in `requestedTags` **or** `requestedTags` includes `"all"`.

So **implicit-off** datasets (e.g. large or licensed layers) only appear when explicitly requested via settings, URL substring, or `all`.

## URL query parameters (`parseLocation` / `rewriteUrl`)

Parsed on load:

| Param | Effect |
| --- | --- |
| `l` | Location. If `l=me`, the map uses browser geolocation (with `watch` only when `follow`/`radar` is set). Otherwise `l=<lat>,<lng>` sets the center. |
| `z` | Zoom level (default **14** if other params set a location; **2** for a world view when lat/lng are absent). |
| `follow` or `radar` | Enables **follow mode**: a “you” marker, `map.locate({ watch: true })`, and recentering on location updates unless a popup is open. |
| `satellite` or `sat` | Uses Esri World Imagery instead of Carto light tiles. |
| Substring **tag names** | Any metadata key appearing anywhere in the lowercased URL selects those layers (see above). |
| `ungroup` | If present, clustering is effectively disabled by setting `disableClusteringAtZoom` to **1** (otherwise clustering turns off at zoom **11**). |

On **`moveend`** and **`zoomend`**, the URL is rewritten with **`history.pushState`** to:

`?l=<lat>,<lng>&z=<zoom>&satellite` (if satellite) `&<tag>...` for tags that came from the URL substring mechanism.

Note: **settings-based** layer choice is not encoded in the rewritten URL—only position, zoom, satellite flag, and URL-derived tags.

## Basemap and clustering

- **Default basemap**: Carto `light_all` tiles (subdomains `abcd`, `maxZoom` 20).
- **Satellite**: Esri World Imagery template URL.
- **Clustering**: `L.markerClusterGroup` with `maxClusterRadius: 60`. Markers are added to the group, not directly to the map, except the optional user “you” marker.

## Settings page (`settings.html` / `settings.js`)

- Reads the same `./src/metadata.json`.
- Builds a sorted list of checkboxes (capitalized label, lowercase `id` = tag).
- **`localStorage` key**: `settings`, JSON shape `{ show: string[], hide: string[] }`. Legacy **`enabled`** is migrated to **`show`**.
- **Apply** writes `settings` and navigates to `/`. **Cancel** returns to `/` without saving.
- Initial checkbox state: if `show` was empty, every tag with `implicit !== false` is added to `show`. Unchecked items are tracked in `hide` so new implicit tags can still default to on unless explicitly hidden (mirrors map-side logic).

## File reference

| File | Role |
| --- | --- |
| `index.html` | Map shell, Leaflet/CSS/CDN scripts, `#map` div, links to settings and Ko-fi. |
| `script.js` | Map behavior, data loading, popups, URL and storage integration. |
| `settings.html` | Minimal UI for toggling categories. |
| `settings.js` | Checkbox UI and `localStorage` persistence. |
| `src/metadata.json` | Per-category configuration and catalog keys. |
| `data/cells/<tag>.tsv` | Point data for category `<tag>`. |
| `markers/<tag>.png` | Icon per category (expected by `getMarker`). |
| `stylesheet.css` | Map page styling (not detailed here). |
| `sw.js` | Service worker: precache and offline tile/runtime behavior. |

## Mental model

**Metadata keys** define what can be shown and how it behaves (**implicit** vs opt-in). **TSV files** supply coordinates and copy. **localStorage** and **URL substrings** choose subsets; **URL query params** control view, basemap, geolocation follow mode, and clustering. Everything else is standard Leaflet: one tile layer, one cluster group full of markers, each with an HTML popup.
