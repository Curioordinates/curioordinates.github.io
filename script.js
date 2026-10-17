// The original map, drawn with the same MapLibre engine as /v2/. Only the basemap differs: CARTO's Positron vector
// style, or Esri's World Imagery with "satellite" (or "sat") in the URL. Pins, grouping, info windows, the URL and
// following the user all come from v2/pins.js.
(() => {
  const params = new URLSearchParams(window.location.search);
  const satellite = params.has("satellite") || params.has("sat");

  // CARTO's font server, which Positron already uses, also serves the numbers on the group bubbles over satellite
  const GLYPHS = "https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf";

  const satelliteStyle = {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      satellite: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      },
    },
    layers: [{ id: "satellite", type: "raster", source: "satellite" }],
  };

  const map = new maplibregl.Map({
    container: "map",
    style: satellite
      ? satelliteStyle
      : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    ...PINS.initialView(),
    minZoom: 0,
    // Leaflet zoom 20, as before
    maxZoom: 19,
    // flat and north-up, as the Leaflet map was
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    maxPitch: 0,
    attributionControl: { compact: true },
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
  map.on("error", (e) => console.error(e.error || e));

  PINS.attach(map, { countFont: ["Open Sans Regular"], countSize: 12 });
})();
