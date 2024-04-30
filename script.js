const loadTsv = async (markerType, addFunction) => {
  console.log("loading markers: " + markerType);
  const fileUrl = `./data/${markerType}.tsv`;
  const response = await fetch(fileUrl);
  console.log("status of fetch: " + response.status);
  const lines = (await response.text()).split("\n");
  for (const line of lines) {
    const fields = line.split("\t");
    //// console.log("line - - - " + line);
    addFunction([Number(fields[0]), Number(fields[1])], markerType, fields[2]);
  }
};

const qs = {};
const parseLocation = () => {
  const url = window.location.href;
  console.log(url);
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
  console.log(qs);
};

const anchor = { iconAnchor: [28, 44] };
const createMarker = (iconUrl) => {
  return L.icon({
    iconUrl,
    iconSize: [57, 57], // size of the icon
    ...anchor,
    popupAnchor: [0, -20], // point from which the popup should open relative to the iconAnchor
  });
};

const markers = {};
const getMarker = (name) => {
  let result = markers[name];
  if (!result) {
    const url = `./markers/${name}.png`;
    result = createMarker(url);
    markers[name] = result;
  }
  return result;
};

let metadata;
const setup = async () => {
  const response = await fetch("./src/metadata.json");
  if (response.status === 200) {
    metadata = await response.json();
  }
  console.log(response.status);

  mapSetup();
};

const mapSetup = () => {
  parseLocation();
  const maxMapZoom = 19;

  //#region Marker setup
  var Gr = getMarker("Gr");
  var Site = createMarker("./markers/Site.png");
  var Uf = createMarker("./markers/Uf.png");
  var Hf = createMarker("./markers/Hf.png");
  var Cm = createMarker("./markers/Cm.png");
  var Mc = createMarker("./markers/Mc.png");
  var Ss = createMarker("./markers/Ss.png");
  var Sm = createMarker("./markers/Sm.png");
  var Mx = createMarker("./markers/Mx.png");
  var amphitheatre = getMarker("amphitheatre");
  var erratic = createMarker("./markers/erratic.png");
  var neoearthworks = createMarker("./markers/neoearthworks.png");
  var fort = createMarker("./markers/fort.png");
  //#endregion Marker setup

  //#region Metadata
  console.log(JSON.stringify(metadata, null, 3));

  const datasets = Object.keys(metadata).map((key) => [key]);
  /*  const datasets = [
    ["redwoods", "redwood"],
    ["sea-monsters", "sea-monster", "lake-monster"],
    ["standing-stones"],
    ["erratic"],
    ["manmade-cave"],
    ["geofolds"],
    ["hauntings"],
    ["exhibits"],
    ["mysteries"],
    ["big-cats"],
    ["weird"],
    ["sites"],
    ["caves"],
    ["fossils"],
    ["strongholds"],
    ["dogs"],
    ["sub-street"],
    ["tunnels"],
  ];
*/

  // parse present items
  const lowercaseUrl = window.location.href.toLowerCase();
  const tagsPresentInUrl = [];
  const allTags = [];
  for (const tagVariants of datasets) {
    allTags.push(tagVariants[0]);
    for (const variant of tagVariants) {
      if (
        lowercaseUrl.indexOf(variant) !== -1 &&
        !tagsPresentInUrl.includes(tagVariants[0])
      ) {
        tagsPresentInUrl.push(tagVariants[0]); // record default variant
      }
    }
  }
  console.log("Tags in url:" + JSON.stringify(tagsPresentInUrl));

  //#endregion

  var map = L.map("map");

  const rewriteUrl = () => {
    const { lat, lng } = map.getCenter();
    qs.latitude = Number(Number(lat).toFixed(5));
    qs.longitude = Number(Number(lng).toFixed(5));
    qs.z = map.getZoom();
    const parts = [`l=${qs.latitude},${qs.longitude}`, `z=${qs.z}`];
    if (qs.satellite || qs.sat) parts.push("satellite");
    for (const tag of tagsPresentInUrl) {
      parts.push(tag);
    }
    window.history.pushState({}, "", `?${parts.join("&")}`);
  };

  map.on("moveend", rewriteUrl);
  map.on("zoomend", rewriteUrl);

  if (qs.follow || qs.l === "me") {
    map.locate({
      setView: true,
      maxZoom: 12,
      watch: !!qs.follow,
    }); //watch=live
  } else {
    if (!qs.latitude && !qs.longitude) {
      qs.z = 2;
    }
    map.setView([qs.latitude || 0, qs.longitude || 0], qs.z);
  }

  //#region Layer setup
  const satellite = [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    },
  ];

  const stadiaSmooth = [
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 20,
      subdomains: "abcd",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  ];
  //#endregion

  const tileLayer = qs.satellite || qs.sat ? satellite : stadiaSmooth;

  const groupedMarkerLayer = L.markerClusterGroup({
    disableClusteringAtZoom: 11,
    maxClusterRadius: 50, // default 80
  });

  const add = (latlng, typeName, name, info, moreLink) => {
    const itemMetadata = metadata[typeName];
    const typeLabel = itemMetadata.typeLabel || typeName;
    const m = L.marker(latlng, { icon: getMarker(typeName) });
    const googleUrl = `https://www.google.com/maps?ll=${latlng[0]},${latlng[1]}&q=${latlng[0]},${latlng[1]}&hl=en&t=m&z=15`;
    const googleLink = `<a href="${googleUrl}" target="google_tab"><img title="on google maps" src="images/google-maps.svg" width=32 height=32 /></a>`;

    const pop = `${name}<br/>type: ${typeLabel}<br/><br/>${googleLink}`;
    m.bindPopup(pop);

    // m.addTo(map);
    groupedMarkerLayer.addLayer(m);
  };

  L.tileLayer(...tileLayer).addTo(map);

  const tagsToLoad = tagsPresentInUrl.length ? tagsPresentInUrl : allTags;
  for (const tagToLoad of tagsToLoad) {
    loadTsv(tagToLoad, add);
  }

  map.addLayer(groupedMarkerLayer);

  /*
  L.marker([52.5825511, 1.6508043], { icon: fort }).addTo(map); // Burgh roman fort
  L.marker([51.5346703, -0.0575498], { icon: Mx }).addTo(map); //The Viktor Wynd Museum of Curiosities, Fine Art & UnNatural History
  L.marker([52.09001, 1.44888], { icon: Uf }).addTo(map); //ufo
  L.marker([52.93022, 0.8905], { icon: Hf }).addTo(map); // Warham Hillfort

  L.marker([51.1784886, -1.8261453], { icon: Cm }).addTo(map); // Stone Henge
  L.marker([51.4403444, -1.7958463], { icon: Ss }).addTo(map); // Long Tom - standiong stone
  L.marker([50.70803, -2.44022], { icon: neoearthworks }).addTo(map); // Maumnbury rings
    add([50.04091, -5.651], "amphitheatre", "The Minac Theatre");
    */
};
