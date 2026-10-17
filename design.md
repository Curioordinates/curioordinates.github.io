# Map design — Untamed Earth

This document describes how the interactive map in this static site works: which files participate, how data flows from disk to the map, and how URLs and settings choose what to show.

## Overview

The site has two maps, both drawn with [MapLibre GL JS](https://maplibre.org/) and sharing one module, `v2/pins.js`, for everything about the places themselves:

- **v1** — `index.html` + `script.js`: a plain basemap (CARTO Positron vector tiles, or Esri satellite imagery).
- **v2** — `v2/index.html` + `v2/app.js`: an antique, hand-tinted style over OpenFreeMap vector tiles, with drawn trees and an aged-paper overlay.

Both maps:

1. Load **dataset definitions** from `src/metadata.json`.
2. Decide which **marker categories** (tags) to load using the URL query string, `localStorage`, and per-dataset `implicit` flags.
3. Fetch one **tab-separated** file per selected tag from `data/cells/<tag>.tsv` and draw a **pin** per row, with an info window on click.
4. Group nearby pins into **clusters** (unless clustering is disabled via the URL).

Which map a visitor sees is chosen on the settings page (Behaviour: "Use v2 map", stored as `settings.useVersion`, default `"v2"`; the older `useV2: false` still means v1). A small script at the top of each `index.html` redirects to the other map, keeping the query string, when the stored choice does not match.

Supporting pages: `settings.html` + `settings.js` (and `v2/settings.html` + `v2/settings.js`) let users persist which categories are shown or hidden.

## Front-end stack

- **MapLibre GL JS 4.7.1** — one copy, `v2/maplibre-gl.js`, loaded by both maps. v1 takes its CSS from `https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css`; v2 inlines it.
- **Pins, clustering and info windows** — MapLibre's own GeoJSON clustering and symbol layers (`v2/pins.js`); no plugins.
- **`timezone-location.js`** — picks a starting view from the visitor's timezone when the URL gives no place.
- v2 also loads `v2/glyphs.js` (the IM Fell fonts as base64 glyph sheets, served through a `fell://` protocol).

Analytics: GoatCounter is loaded via `count.js`.

There is no build step for the maps: the browser loads plain HTML and JS and fetches JSON/TSV at runtime.

## Shared pin module (`v2/pins.js`)

`pins.js` defines a global `PINS` with two functions:

- **`PINS.initialView()`** — parses the URL and returns `{ center, zoom }` for the `maplibregl.Map` constructor.
- **`PINS.attach(map, options)`** — adds the `pins` source and layers on `style.load`, loads the chosen TSVs, and wires up clicks, info windows, URL rewriting, the settings link and follow mode. `options.countFont` / `options.countSize` set the font of the numbers on cluster bubbles; the font must be one the map style's glyph server provides (v2 uses the default `["FellRoman"]`, 15; v1 passes `["Open Sans Regular"]`, 12 from CARTO's font server).

All site paths (`src/`, `data/cells/`, `markers/`, `images/`) are resolved against the **site root**, worked out from the script's own URL (`new URL("..", document.currentScript.src)`), so the module works from either page.

**Zoom numbers.** MapLibre counts zoom in 512 px tiles, Leaflet (which the original map used) in 256 px tiles, so the same view is one level lower in MapLibre. URLs keep the Leaflet numbers (`toLeafletZoom` / `toMapLibreZoom`), so a link opens the same view in either map and old links keep working.

## v1 map (`index.html` / `script.js`)

`script.js` only builds the map; everything else comes from `pins.js`:

- **Default basemap**: CARTO Positron vector style, `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`.
- **Satellite** (`satellite` or `sat` in the URL): a small inline style with one Esri World Imagery raster source (256 px tiles, source `maxzoom` 19, overzoomed beyond). Its `glyphs` point at CARTO's font server so cluster counts can be drawn.
- `maxZoom` 19 (Leaflet 20). The map is kept flat and north-up like the old Leaflet map: rotation and pitch are disabled, and the zoom buttons sit top-left with no compass.

## Offline support (`sw.js`)

A **service worker** (not a Web Worker) registers from `index.html` and `settings.html` as `./sw.js` with scope `./`. (v2 has its own, `v2/sw.js`, with scope `./v2/` and caches named `antique-v2-*`.)

**Install (`install` event)** precaches into `untamed-static-v6` (bump the name in `sw.js` when you need to invalidate cached shell assets):

- Core pages and assets: `index.html`, `settings.html`, `script.js`, `settings.js`, `stylesheet.css`, `timezone-location.js`, `v2/maplibre-gl.js`, `v2/pins.js`, popup/link images under `images/`, and `src/metadata.json`.
- Third-party files: the MapLibre CSS from unpkg and `https://gc.zgo.at/count.js` (GoatCounter).
- **`markers/<tag>.png`** for every key in `metadata.json`, plus **`markers/you.png`** (used in follow mode). Missing files are skipped without failing install. SVGs under `markers/` are source assets; the running app uses the PNGs.

**`data/cells/*.tsv`** is **not** bulk-downloaded at install. Each TSV is **cached the first time** the app requests it (same network-first + store pattern as other same-origin assets), so growth in cell files does not slow or bloat install.

**Runtime cache** `untamed-runtime-v1` stores **map tiles, styles and fonts** (any `basemaps.cartocdn.com` host, and Esri's `arcgisonline.com`) as you pan and zoom: **network first**, then cache, so previously viewed areas can still draw offline.

**Fetch handling**: Same-origin requests are always revalidated with the server (GitHub Pages lets browsers reuse files for 10 minutes, which could mix a new page with old scripts after a deploy). Same-origin requests and the CDN hosts use **network-first with cache fallback**; tile hosts use the runtime cache. Offline **navigation** falls back to cached `index.html` or `settings.html` when the exact URL (e.g. with `?l=…`) is not in cache.

**Activation**: Old caches named `untamed-*` from prior versions are deleted; `skipWaiting` + `clients.claim()` apply updates promptly.

**Limitations**: First offline visit requires at least one successful online load so the install precache can run. **Layers** you have not loaded while online will not be available offline until fetched. The **basemap** offline is limited to **tiles already fetched**. External links in popups (Google Maps, Komoot, etc.) need network. Geolocation still requires user permission and may not work without connectivity depending on device.

## `src/metadata.json` — the dataset catalog

`metadata.json` is a single JSON object whose **keys are tag names** (e.g. `"fairy"`, `"stone-circle"`). Each value is metadata for that category. Common fields:

| Field | Role |
| --- | --- |
| `count` | Record count (informational; used for catalog/awareness, not enforced at runtime). |
| `implicit` | If **`false`**, this category is **opt-in**: it is not auto-added for users who rely only on defaults/new-tag behavior. If omitted or `true`, the category behaves as **on by default** when settings are empty or when new tags are merged in. **`world-heritage`** sets `"implicit": true` explicitly; most entries omit it and behave as implicit-on. |
| `typeLabel` | Overrides the category title shown in the popup header (default: the tag string). |
| `short_description` | Optional HTML block shown in the popup (below the main text, above the external links). |
| `".<>"`, `"<>"`, `"<>.\"` | Customize how the “more info” link is wrapped (prefix, anchor text, suffix). Used for special cases like `e-book` or `scratch-dial`. |
| `name_all` | Present on some entries (e.g. `redwood`); not referenced by the maps (may be for other tooling). |
| `link` | Present on some entries (e.g. `wayside-cross`); popup link behavior is driven by **per-row** TSV links, not this field. |

The set of **keys in `metadata.json`** is the authoritative list of categories the map **knows how to load**. Extra `.tsv` files under `data/cells/` that do not correspond to a metadata key are **never fetched** by the maps.

## `data/cells/*.tsv` — point data

Each active tag loads **`data/cells/<tag>.tsv`** via `loadTsv(tag, add)` in `pins.js`, after its icon has been loaded.

**Column layout** (tab-separated, one row per place):

| Index | Field | Use |
| --- | --- | --- |
| 0 | Latitude | `Number` → pin position. |
| 1 | Longitude | `Number` → pin position. |
| 2 | Name | Primary title in the popup. |
| 3 | Link | URL for “more info”; `-` or `/` means no link. |
| 4 | Details | Optional longer HTML/text; shown in `.pop-details`. |
| 5 | Tags | Optional; if it includes `#attrib`, link styling uses the host name from the URL (`hostNameFromLink`). |

Rows whose latitude or longitude is not a number (such as the empty line at the end of a file) are skipped. Each row becomes a GeoJSON point feature; the exact latitude and longitude are also kept in its properties for the popup links. Many files arrive close together, so the `pins` source is refreshed at most every 150 ms.

**Icons**: **`markers/<tag>.png`**, drawn at 57 × 57 px whatever the PNG's size, never scaled with zoom, with the point at (28, 44) in the icon. Every pin is drawn even where pins overlap; lower pins on screen sit on top.

## Popups (`popupHtml()` / `openPopup()` in `pins.js`)

Clicking a pin opens a MapLibre popup 20 px above the point with:

- Category label (`typeLabel` or tag name) and folder icon.
- Title and optional details / link line (link placement depends on whether details exist).
- Optional `short_description` from metadata.
- A row of **external actions**: Google Maps, Komoot, OpenStreetMap, Wikimap, plus a **mailto** feedback link seeded with type, name, and coordinates.

Tags in field 5 enable the `#attrib` link presentation variant. Only one popup is open at a time, and the map pans to keep an opened popup fully on screen. v1 styles popups like the old white Leaflet ones (`stylesheet.css`); v2 uses parchment and ink (`v2/style.css`).

## Which categories load (`chooseTags()` in `pins.js`)

Priority and rules:

1. **URL “tag hints”** — The full URL is lowercased; if any **metadata key** appears as a substring of the URL, those keys are collected as `tagsPresentInUrl`. (This is substring matching, not a structured query parameter.)
2. If any such tags exist, they **override** saved settings: `requestedTags = tagsPresentInUrl`.
3. Otherwise, `requestedTags` comes from **`localStorage`** `settings.show` (or legacy `settings.enabled`).
4. If `requestedTags` is still empty, **all metadata keys** are considered, so the default is “everything the app knows about,” subject to the next steps.
5. **Merge implicit / new tags** — If the URL did **not** supply tag hints, then for each metadata key: if it is not hidden, not already in `tagsToLoad`, and `implicit !== false`, it is appended so **new categories** appear for existing users without wiping their `hide` list.
6. **Loading gate** — For each tag in `tagsToLoad`, a TSV is loaded only if:
   - `metadata[tag]` exists, and  
   - `implicit !== false` **or** the tag is in `requestedTags` **or** `requestedTags` includes `"all"`.

So **implicit-off** datasets (e.g. large or licensed layers) only appear when explicitly requested via settings, URL substring, or `all`.

## URL query parameters (`parseLocation` / `rewriteUrl` in `pins.js`)

Parsed on load:

| Param | Effect |
| --- | --- |
| `l` | Location. If `l=me`, the map jumps to the browser's position once it is known. Otherwise `l=<lat>,<lng>` sets the center. |
| `z` | Zoom level, in Leaflet numbers (default **14** when a location is given). With no location, the view starts on the visitor's timezone at zoom **6** (`TIMEZONE_ZOOM`), or on the whole world at zoom **2** if the timezone is unknown. |
| `follow` or `radar` | Enables **follow mode**: a “you” marker kept on the user's position (`navigator.geolocation.watchPosition`), recentering on each update unless a popup is open. |
| `satellite` or `sat` | v1: uses Esri World Imagery instead of CARTO Positron. v2 ignores it but keeps it in the URL. |
| Substring **tag names** | Any metadata key appearing anywhere in the lowercased URL selects those layers (see above). |
| `ungroup` | If present, clustering is turned off. |

On **`moveend`**, the URL is rewritten with **`history.pushState`** to:

`?l=<lat>,<lng>&z=<zoom>` then `&satellite`, `&follow`, `&radar`, `&ungroup` when set, then `&<tag>...` for tags that came from the URL substring mechanism.

The settings button's link is updated to carry the same query string, so going to settings and back (or switching maps there) returns to the same view.

Note: **settings-based** layer choice is not encoded in the rewritten URL—only position, zoom, flags, and URL-derived tags.

## Clustering

- MapLibre GeoJSON clustering on the `pins` source with `clusterRadius` **60** px; clusters stop at Leaflet zoom **11** (MapLibre `clusterMaxZoom` 9), as `Leaflet.markercluster` was set up before.
- Bubbles use markercluster's default colours: green under 10, yellow under 100, orange beyond, with a pale halo; bubbles widen for four- and five-digit counts.
- Clicking a bubble eases the map to the zoom where that cluster splits.
- The optional user “you” marker is a separate `maplibregl.Marker`, not part of the source.

## Settings page (`settings.html` / `settings.js`)

- Reads the same `src/metadata.json`.
- Builds a sorted list of checkboxes (capitalized label, lowercase `id` = tag).
- **`localStorage` key**: `settings`, JSON shape `{ show: string[], hide: string[] }`. Legacy **`enabled`** is migrated to **`show`**. The "Use v2 map" switch stores `useVersion` in the same object.
- **Apply** writes `settings` and navigates to `/` with the current query string. **Cancel** does the same without saving. `/` then sends v2 users on to `/v2/`.
- Initial checkbox state: if `show` was empty, every tag with `implicit !== false` is added to `show`. Unchecked items are tracked in `hide` so new implicit tags can still default to on unless explicitly hidden (mirrors map-side logic).

## File reference

| File | Role |
| --- | --- |
| `index.html` | v1 map shell: MapLibre CSS and scripts, `#map` div, links to settings and Ko-fi, redirect to v2 when chosen. |
| `script.js` | v1 basemap (Positron or satellite) and map options. |
| `stylesheet.css` | v1 page and popup styling. |
| `v2/index.html`, `v2/app.js`, `v2/style.css` | v2 map: antique style, trees, paper overlay. |
| `v2/pins.js` | Shared by both maps: data loading, pins, clustering, popups, URL and storage integration, follow mode. |
| `v2/maplibre-gl.js` | MapLibre GL JS 4.7.1, shared by both maps. |
| `timezone-location.js` | Starting view from the visitor's timezone. |
| `settings.html` | Minimal UI for toggling categories. |
| `settings.js` | Checkbox UI and `localStorage` persistence. |
| `src/metadata.json` | Per-category configuration and catalog keys. |
| `data/cells/<tag>.tsv` | Point data for category `<tag>`. |
| `markers/<tag>.png` | Icon per category. |
| `sw.js` | v1 service worker: precache and offline tile/runtime behavior. |

## Mental model

**Metadata keys** define what can be shown and how it behaves (**implicit** vs opt-in). **TSV files** supply coordinates and copy. **localStorage** and **URL substrings** choose subsets; **URL query params** control view, basemap, geolocation follow mode, and clustering. Both maps are one MapLibre map with a basemap style plus the same `pins` source from `pins.js`: a clustered GeoJSON source of points, each with an HTML popup.
