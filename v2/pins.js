/* Pins: the same places, icons, grouping and info windows as the original Leaflet map (/index.html, /script.js),
   drawn natively by MapLibre. The data is read exactly as the original reads it: ../src/metadata.json lists the tags,
   ../data/cells/<tag>.tsv holds each tag's places, ../markers/<tag>.png is its icon, and the tags shown come from the
   URL or from the settings page (localStorage "settings"). */
const PINS = (() => {
  const ROOT = "../";

  // Leaflet counts zoom in 256 px tiles and MapLibre in 512 px ones, so the same view is one zoom level less here.
  // URLs keep Leaflet's numbers so links work in both maps.
  const toMapLibreZoom = (z) => Number(z) - 1;
  const toLeafletZoom = (z) => Math.round((z + 1) * 100) / 100;

  const mapState = {
    isPopupOpen: false,
  };
  let userMarker; // Used if following user.
  let followUser;

  const savedSettingsString = localStorage.getItem("settings");
  const savedSettings = savedSettingsString
    ? JSON.parse(savedSettingsString)
    : { show: [], hide: [] };

  const qs = {};
  const parseLocation = () => {
    const url = window.location.href;
    const i = url.indexOf("?");

    if (i !== -1) {
      url
        .substring(i + 1)
        .split("&")
        .forEach((pair) => {
          const [k, v] = pair.split("=");
          qs[k] = v ?? 1;
          if (k === "l") {
            if (v !== "me") {
              const ll = v.split(",");
              qs.latitude = Number(`${ll[0]}`.trim()) || 0;
              qs.longitude = Number(`${ll[1]}`.trim()) || 0;
            }
          }
        });
    }
    qs.z = qs.z ?? 14;
    followUser = !!qs.follow || !!qs.radar;
  };
  parseLocation();

  // The view to open on, as the original: the URL's place and zoom, or the whole world at zoom 2.
  // When following the user (or l=me) with no place given, the world is shown until their position arrives.
  const initialView = () => {
    const located = followUser || qs.l === "me";
    if (!located && !qs.latitude && !qs.longitude) {
      qs.z = 2;
    }
    const waiting = located && !qs.latitude && !qs.longitude;
    return {
      center: [qs.longitude || 0, qs.latitude || 0],
      zoom: toMapLibreZoom(waiting ? 2 : qs.z),
    };
  };

  //#region Icons
  // Every icon is shown at 57 x 57 (stretched if the PNG is another size, as Leaflet's iconSize does), never scaled
  // with zoom, with the point at (28, 44) in the icon; the info window's tip sits 20 px above the point.
  const ICON_SIZE = 57;
  const ICON_ANCHOR = [28, 44];
  const POPUP_LIFT = 20;

  const loadIcon = (map, tag) =>
    new Promise((resolve) => {
      const id = `pin-${tag}`;
      if (map.hasImage(id)) {
        resolve();
        return;
      }
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = Math.round(ICON_SIZE * ratio);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (!map.hasImage(id)) {
          map.addImage(id, ctx.getImageData(0, 0, canvas.width, canvas.height), {
            pixelRatio: ratio,
          });
        }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = `${ROOT}markers/${tag}.png`;
    });
  //#endregion

  //#region Data
  const loadTsv = async (markerType, addFunction) => {
    const fileUrl = `${ROOT}data/cells/${markerType}.tsv`;
    const response = await fetch(fileUrl);
    const lines = (await response.text()).split("\n");
    for (const line of lines) {
      const fields = line.split("\t");
      addFunction(
        [Number(fields[0]), Number(fields[1])],
        markerType,
        fields[2],
        fields[3],
        fields[4], // details
        fields[5], // tags
      );
    }
  };

  // Which tags to show: tags named in the URL override the settings page; tags new since the settings were saved
  // are shown unless they are opt-in (implicit: false).
  const chooseTags = (metadata) => {
    const lowercaseUrl = window.location.href.toLowerCase();
    const tagsPresentInUrl = [];
    const allTags = Object.keys(metadata);
    for (const tag of allTags) {
      if (lowercaseUrl.indexOf(tag) !== -1 && !tagsPresentInUrl.includes(tag)) {
        tagsPresentInUrl.push(tag);
      }
    }

    // Url tags override settings.
    const requestedTags = tagsPresentInUrl.length
      ? tagsPresentInUrl
      : (savedSettings.show ?? savedSettings.enabled);
    const tagsToLoad = requestedTags.length ? [...requestedTags] : [...allTags];

    if (tagsPresentInUrl.length === 0) {
      // we are using settings
      for (const tag of allTags) {
        if (!savedSettings.hide.includes(tag) && !tagsToLoad.includes(tag)) {
          // this is a new tag that the users settings is unaware of.
          if (metadata[tag].implicit !== false) {
            tagsToLoad.push(tag);
          }
        }
      }
    }

    const load = tagsToLoad.filter((tag) => {
      const tagMetadata = metadata[tag];
      return (
        tagMetadata &&
        (tagMetadata.implicit !== false ||
          requestedTags.includes(tag) ||
          requestedTags.includes("all"))
      );
    });
    return { load, tagsPresentInUrl };
  };
  //#endregion

  //#region Info window
  const hostNameFromLink = (link) => {
    if (!link) {
      return null;
    }
    const url = new URL(link);
    return url.hostname;
  };

  // The same info window as the original, with image paths taken from the site root.
  const popupHtml = (itemMetadata, latitude, longitude, typeName, name, link, details, tags) => {
    const typeLabel = itemMetadata.typeLabel || typeName;
    const googleUrl = `https://www.google.com/maps?ll=${latitude},${longitude}&q=${latitude},${longitude}&hl=en&t=m&z=15`;
    const googleLink = `<a href="${googleUrl}" target="google_tab"><img title="on google maps" src="${ROOT}images/google-maps.svg" width=32 height=32 /></a>`;

    const komootUrl = `https://www.komoot.com/plan/@${latitude},${longitude},13.524z?p[0]&p[1][loc]=${latitude},${longitude}`;
    const komootLink = `<a href="${komootUrl}" target="google_tab"><img title="on komoot" src="${ROOT}images/komoot.svg" width=32 height=32 /></a>`;

    const osmUrl = `https://www.openstreetmap.org/#map=18/${latitude}/${longitude}`;
    const osmLink = `<a href="${osmUrl}" target="google_tab"><img title="on open street map" src="${ROOT}images/osm.svg" width=32 height=32 /></a>`;

    const wikimapUrl = `https://wikimap.toolforge.org/?wp=false&cluster=false&zoom=16&lat=${latitude}&lon=${longitude}`;
    const wikimapLink = `<a href="${wikimapUrl}" target="wikimap_tab"><img title="on wikimap" src="${ROOT}images/wikimap.svg" width=32 height=32 /></a>`;

    const feedbackUrl = `mailto:weird_radar@gmail.com?subject=${typeName}-feedback&body=Regarding%20the%20${typeName}%20${encodeURIComponent(
      "(" + name + ")",
    )}%20at%20${latitude},${longitude},%0A`;
    const feedbackLink = `<a href='${feedbackUrl}' title='Send feedback on this item'>[feedback]</a>`;

    const folderImage = `<img src="${ROOT}images/folder.svg" />`;

    let secondaryTextDiv = "";

    if (details) {
      secondaryTextDiv = details;
    }

    let nameFragment = name;

    if (link && link !== "-" && link !== "/") {
      let linkPrefix = itemMetadata[".<>"] || "(";
      let linkText = itemMetadata["<>"] || "more&nbsp;info";
      let linkPostfix = itemMetadata["<>."] || ")";
      if (tags?.includes("#attrib")) {
        // we can override prefix, linkText and Postfix here.
        linkPrefix = "(";
        linkText = "read more";
        linkPostfix = ` at <strong>${hostNameFromLink(link)}</strong>)`;
      }

      const linkFragment = `${linkPrefix}<a href='${link}' target='_blank'>${linkText}</a>${linkPostfix}`;
      if (secondaryTextDiv) {
        // put the link on the title
        secondaryTextDiv += " " + linkFragment;
      } else {
        nameFragment += "<br>" + linkFragment;
        // link can be on a second line to replace the 'secondary text'
      }
    }

    let pop = `<div id="pop-cat">${folderImage} ${typeLabel}</div><div id="pop-title">${nameFragment}</div>`;

    if (secondaryTextDiv) {
      pop += `<div class="pop-details">${secondaryTextDiv}</div>`;
    }

    pop += "<br>";

    if (itemMetadata.short_description) {
      pop += `<hr><div class="pop-details">${itemMetadata.short_description}</div>`;
    }

    pop += `<div id="pop-links">${googleLink}&nbsp;${komootLink}&nbsp;${osmLink}&nbsp;${wikimapLink}&nbsp;${feedbackLink}</div>`;
    return pop;
  };

  // Like Leaflet's autoPan: nudge the map so an opened info window is not cut off by the edge of the map.
  const keepInView = (map, popup) => {
    requestAnimationFrame(() => {
      const el = popup.getElement();
      if (!el) {
        return;
      }
      const pad = 5;
      const r = el.getBoundingClientRect();
      const m = map.getContainer().getBoundingClientRect();
      let dx = 0;
      let dy = 0;
      if (r.top < m.top + pad) dy = r.top - (m.top + pad);
      else if (r.bottom > m.bottom - pad) dy = r.bottom - (m.bottom - pad);
      if (r.left < m.left + pad) dx = r.left - (m.left + pad);
      else if (r.right > m.right - pad) dx = r.right - (m.right - pad);
      if (dx || dy) {
        map.panBy([dx, dy]);
      }
    });
  };
  //#endregion

  const attach = (map, metadataPromise) => {
    const noGrouping = window.location.href.toLowerCase().includes("ungroup");
    const features = [];
    let metadata = {};
    let tagsPresentInUrl = [];
    let popup = null;

    // Many files arrive close together, so the source is refreshed at most every 150 ms rather than once per file.
    let updateTimer = null;
    const scheduleUpdate = () => {
      if (updateTimer) {
        return;
      }
      updateTimer = setTimeout(() => {
        updateTimer = null;
        map.getSource("pins")?.setData({ type: "FeatureCollection", features });
      }, 150);
    };

    const add = (latlng, typeName, name, link, details, tags) => {
      const [latitude, longitude] = latlng;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !metadata[typeName]) {
        return; // e.g. the empty line at the end of a file
      }
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [longitude, latitude] },
        // the exact latitude and longitude are kept for the info window's links: coordinates read back from the
        // drawn map are rounded to the tile grid
        properties: { tag: typeName, lat: latitude, lng: longitude, name, link, details, tags },
      });
      scheduleUpdate();
    };

    const openPopup = (feature) => {
      const p = feature.properties;
      const thisPopup = new maplibregl.Popup({
        anchor: "bottom",
        offset: [0, -POPUP_LIFT],
        maxWidth: "300px",
        focusAfterOpen: false,
      })
        .setLngLat([p.lng, p.lat])
        .setHTML(popupHtml(metadata[p.tag], p.lat, p.lng, p.tag, p.name, p.link, p.details, p.tags));
      thisPopup.on("close", () => {
        if (popup === thisPopup) {
          popup = null;
          mapState.isPopupOpen = false;
        }
      });
      const previous = popup;
      popup = thisPopup;
      previous?.remove();
      thisPopup.addTo(map);
      mapState.isPopupOpen = true;
      keepInView(map, thisPopup);
    };

    const rewriteUrl = () => {
      const { lat, lng } = map.getCenter();
      qs.latitude = Number(lat).toFixed(5);
      qs.longitude = Number(lng).toFixed(5);
      qs.z = toLeafletZoom(map.getZoom());
      const parts = [`l=${qs.latitude},${qs.longitude}`, `z=${qs.z}`];
      if (qs.satellite || qs.sat) parts.push("satellite");
      if (qs.follow) parts.push("follow");
      if (qs.radar) parts.push("radar");
      if (noGrouping) parts.push("ungroup");
      for (const tag of tagsPresentInUrl) {
        parts.push(tag);
      }
      window.history.pushState({}, "", `?${parts.join("&")}`);
    };

    map.on("style.load", () => {
      // Grouping as Leaflet.markercluster had it: a 60 px radius, and no groups from Leaflet zoom 11 (MapLibre 10).
      map.addSource("pins", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: !noGrouping,
        clusterRadius: 60,
        clusterMaxZoom: toMapLibreZoom(11) - 1,
      });
      // group bubbles in markercluster's default colours: green under 10, yellow under 100, orange beyond,
      // with a solid centre so the count reads; bubbles widen for four- and five-digit counts
      const bySize = (small, medium, large) => ["step", ["get", "point_count"], small, 10, medium, 100, large];
      const byDigits = (r) => ["step", ["get", "point_count"], r, 1000, r + 3, 10000, r + 7];
      map.addLayer({
        id: "pin-groups-halo",
        type: "circle",
        source: "pins",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": byDigits(21),
          "circle-color": bySize("rgba(181,226,140,.6)", "rgba(241,211,87,.6)", "rgba(253,156,115,.6)"),
        },
      });
      map.addLayer({
        id: "pin-groups",
        type: "circle",
        source: "pins",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": byDigits(16),
          "circle-color": bySize("rgb(110,204,57)", "rgb(240,194,12)", "rgb(241,128,23)"),
        },
      });
      map.addLayer({
        id: "pin-group-counts",
        type: "symbol",
        source: "pins",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["to-string", ["get", "point_count"]],
          "text-font": ["literal", ["FellRoman"]],
          "text-size": 15,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: { "text-color": "#000" },
      });
      // every pin is drawn, overlapping or not, as Leaflet does; lower pins on screen sit on top
      map.addLayer({
        id: "pins",
        type: "symbol",
        source: "pins",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["concat", "pin-", ["get", "tag"]],
          "icon-anchor": "top-left",
          "icon-offset": [-ICON_ANCHOR[0], -ICON_ANCHOR[1]],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "symbol-z-order": "viewport-y",
        },
      });

      metadataPromise.then((md) => {
        metadata = md;
        const chosen = chooseTags(metadata);
        tagsPresentInUrl = chosen.tagsPresentInUrl;
        for (const tag of chosen.load) {
          loadIcon(map, tag).then(() => loadTsv(tag, add));
        }
      });
    });

    // clicking a group zooms in until it splits, as markercluster's zoom-to-bounds does
    map.on("click", "pin-groups-halo", async (e) => {
      const f = e.features[0];
      const zoom = await map.getSource("pins").getClusterExpansionZoom(f.properties.cluster_id);
      map.easeTo({ center: f.geometry.coordinates, zoom });
    });
    map.on("click", "pins", (e) => openPopup(e.features[0]));
    for (const layer of ["pins", "pin-groups-halo"]) {
      map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
    }

    map.on("moveend", rewriteUrl);

    const settingsLink = document.querySelector("#settingsbutton a");
    if (settingsLink) {
      settingsLink.href = `settings.html${window.location.search}`;
    }

    // follow / radar: keep a "you" pin on the user's position and the map centred on it unless an info window is open
    if (followUser && navigator.geolocation) {
      const el = document.createElement("img");
      el.src = `${ROOT}markers/you.png`;
      el.width = el.height = ICON_SIZE;
      navigator.geolocation.watchPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        if (!userMarker) {
          userMarker = new maplibregl.Marker({
            element: el,
            anchor: "top-left",
            offset: [-ICON_ANCHOR[0], -ICON_ANCHOR[1]],
          })
            .setLngLat([longitude, latitude])
            .addTo(map);
        }
        userMarker.setLngLat([longitude, latitude]);
        if (!mapState.isPopupOpen) {
          map.easeTo({ center: [longitude, latitude], zoom: toMapLibreZoom(qs.z) });
        }
      });
    } else if (qs.l === "me" && navigator.geolocation) {
      // l=me: start on the user's position
      navigator.geolocation.getCurrentPosition((pos) => {
        map.jumpTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: toMapLibreZoom(qs.z) });
      });
    }
  };

  const metadataPromise = fetch(`${ROOT}src/metadata.json`).then((r) => (r.status === 200 ? r.json() : {}));

  return { initialView, attach: (map) => attach(map, metadataPromise) };
})();
