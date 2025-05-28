const loadTsv = async (markerType, addFunction) => {
  console.log("loading markers: " + markerType);
  const fileUrl = `./data/cells/${markerType}.tsv`;
  const response = await fetch(fileUrl);
  console.log("status of fetch: " + response.status);
  const lines = (await response.text()).split("\n");
  for (const line of lines) {
    const fields = line.split("\t");
    //// console.log("line - - - " + line);
    addFunction(
      [Number(fields[0]), Number(fields[1])],
      markerType,
      fields[2],
      fields[3],
      fields[4]
    );
  }
};

const mapState = {
    isPopupOpen: false,
};
let userMarker; // Used if following user.
let followUser;

const savedSettingsString = localStorage.getItem("settings");
const savedSettings = savedSettingsString
    ? JSON.parse(savedSettingsString)
    : { show: [], hide: [] };
console.log("got local:" + JSON.stringify(savedSettings));

const qs = {};
const parseLocation = () => {
    const url = window.location.href;
    console.log(url);
    const i = url.indexOf("?");

    if (i !== -1) {
        url.substring(i + 1)
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

    //#region Metadata
    console.log(JSON.stringify(metadata, null, 3));

    const datasets = Object.keys(metadata).map((key) => [key]);

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

    // Url tags override settings.
    const requestedTags = tagsPresentInUrl.length
        ? tagsPresentInUrl
        : savedSettings.show ?? savedSettings.enabled;
    console.log("requestedTags: " + JSON.stringify(requestedTags));
    const tagsToLoad = requestedTags.length ? requestedTags : allTags;
    console.log("tagsToLoad:" + JSON.stringify(tagsToLoad));

    if (tagsPresentInUrl.length === 0) {
        // we are using settings
        for (const tag of Object.keys(metadata)) {
            if (
                !savedSettings.hide.includes(tag) &&
                !tagsToLoad.includes(tag)
            ) {
                // this is a new tag that the users settings is unaware of.
                if (metadata[tag].implicit !== false) {
                    console.log(
                        `Showing tag ${tag} as it is new to the users settings.`
                    );
                    tagsToLoad.push(tag);
                }
            }
        }
    }

    var map = L.map("map");

    map.on("popupopen", () => (mapState.isPopupOpen = true));
    map.on("popupclose", () => (mapState.isPopupOpen = false));

    const rewriteUrl = (e) => {
        console.log("rewriting url");
        const originalZoom = qs.z || 2;
        const { lat, lng } = map.getCenter();
        qs.latitude = Number(lat).toFixed(5);
        qs.longitude = Number(lng).toFixed(5);
        qs.z = map.getZoom() || originalZoom;
        console.log("set zoom to: " + qs.z);
        const parts = [`l=${qs.latitude},${qs.longitude}`, `z=${qs.z}`];
        if (qs.satellite || qs.sat) parts.push("satellite");
        for (const tag of tagsPresentInUrl) {
            parts.push(tag);
        }
        window.history.pushState({}, "", `?${parts.join("&")}`);
    };

    map.on("moveend", rewriteUrl);
    map.on("zoomend", rewriteUrl);
    if (followUser) {
        userMarker = L.marker([0, 0], { icon: getMarker("you") }).addTo(map);
        map.on("locationfound", (e) => {
            console.log("locationfound: " + e);
            userMarker.setLatLng([e.latitude, e.longitude]);
            if (!mapState.isPopupOpen) {
                map.setView([e.latitude, e.longitude], qs.z);
            }
        });
    }

    if (followUser || qs.l === "me") {
        if (!qs.z) qs.z = 11;
        map.locate({
            setView: false, // don't auto move/zoom map
            watch: followUser,
            animate: true,
        });
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

    const tileLayer = qs.satellite || qs.sat ? satellite : stadiaSmooth;
    //#endregion

    const noGrouping = lowercaseUrl.includes("ungroup");

    const groupedMarkerLayer = L.markerClusterGroup({
        disableClusteringAtZoom: noGrouping ? 1 : 11,
        maxClusterRadius: 60, // default 80
    });

    const add = (latlng, typeName, name, link, details) => {
        const itemMetadata = metadata[typeName];
        const [latitude, longitude] = latlng;
        const typeLabel = itemMetadata.typeLabel || typeName;
        const m = L.marker(latlng, { icon: getMarker(typeName) });
        const googleUrl = `https://www.google.com/maps?ll=${latlng[0]},${latlng[1]}&q=${latlng[0]},${latlng[1]}&hl=en&t=m&z=15`;
        const googleLink = `<a href="${googleUrl}" target="google_tab"><img title="on google maps" src="images/google-maps.svg" width=32 height=32 /></a>`;

        const komootUrl = `https://www.komoot.com/plan/@${latitude},${longitude},13.524z?p[0]&p[1][loc]=${latitude},${longitude}`;
        const komootLink = `<a href="${komootUrl}" target="google_tab"><img title="on komoot" src="images/komoot.svg" width=32 height=32 /></a>`;

        const osmUrl = `https://www.openstreetmap.org/#map=18/${latitude}/${longitude}`;
        const osmLink = `<a href="${osmUrl}" target="google_tab"><img title="on open street map" src="images/osm.svg" width=32 height=32 /></a>`;

        const wikimapUrl = `https://wikimap.toolforge.org/?wp=false&cluster=false&zoom=16&lat=${latitude}&lon=${longitude}`;
        const wikimapLink = `<a href="${wikimapUrl}" target="wikimap_tab"><img title="on wikimap" src="images/wikimap.svg" width=32 height=32 /></a>`;

        const folderImage = `<img src="./images/folder.svg" />`;

        let secondaryTextDiv = "";

        if (details) {
            secondaryTextDiv = details;
        }

        let nameFragment = name;

        if (link && link !== "-" && link !== "/") {
            const linkPrefix = itemMetadata[".<>"] || "(";
            const linkText = itemMetadata["<>"] || "more&nbsp;info";
            const linkPostfix = itemMetadata["<>."] || ")";

            const linkFragment = `${linkPrefix}<a href='${link}' target='_blank'>${linkText}</a>${linkPostfix}`;
            if (secondaryTextDiv) {
                // put the link on the title
                secondaryTextDiv += " " + linkFragment;
            } else {
                nameFragment += "<br>" + linkFragment;
                // link can be on a second line to replace the 'secondary text'
            }
        }
        // if no details - link on second line
        // if details - same line

        let pop = `<div id="pop-cat">${folderImage} ${typeLabel}</div><div id="pop-title">${nameFragment}</div>`;

        if (secondaryTextDiv) {
            pop += `<div class="pop-details">${secondaryTextDiv}</div>`;
        }

        pop += "<br>";

        if (itemMetadata.short_description) {
            pop += `<hr><div class="pop-details">${itemMetadata.short_description}</div>`;
        }

        pop += `<div id="pop-links">${googleLink}&nbsp;${komootLink}&nbsp;${osmLink}&nbsp;${wikimapLink}</div>`;

        m.bindPopup(pop, {});

        // m.addTo(map);
        groupedMarkerLayer.addLayer(m);
    };

    L.tileLayer(...tileLayer).addTo(map);

    for (const tagToLoad of tagsToLoad) {
        const tagMetadata = metadata[tagToLoad];
        if (!tagMetadata) {
            continue;
        }
        const shouldLoad =
            tagMetadata.implicit !== false ||
            requestedTags.includes(tagToLoad) ||
            requestedTags.includes("all");
        if (!shouldLoad) {
            console.log(
                `Skipping ${tagToLoad} as not implicit and not requested`
            );
            continue;
        }
        loadTsv(tagToLoad, add);
    }

    map.addLayer(groupedMarkerLayer);
};
