const settingsString = localStorage.getItem("settings");

const settings = settingsString
  ? JSON.parse(settingsString)
  : { show: [], hide: [] };

if (settings.enabled) {
  settings.show = settings.enabled;
  delete settings.enabled;
}
if (!settings.hide) {
  settings.hide = [];
}

let metadata;
const setup = async () => {
  const response = await fetch("../src/metadata.json");
  if (response.status === 200) {
    metadata = await response.json();
  }
  console.log(response.status);

  uiSetup();
};

const handleChecked = (e) => {
  console.log(JSON.stringify(e));
  const checked = e.target.checked;
  const tag = e.target.id;
  console.log(`${tag} ${checked}`);
  if (checked) {
    if (!settings.show.includes(tag)) {
      settings.show.push(tag);
    }
    settings.hide = settings.hide.filter((testItem) => testItem !== tag);
  } else {
    if (!settings.hide.includes(tag)) {
      settings.hide.push(tag);
    }
    settings.show = settings.show.filter((testItem) => testItem !== tag);
  }

  console.log(JSON.stringify(settings));
};

const handleApply = () => {
  localStorage.setItem("settings", JSON.stringify(settings));
  if (settings.useV2 === false) {
    // switched back to the original map: go there rather than back to v2
    window.location.href = `../${window.location.search}`;
    return;
  }
  handleCancel();
};

const handleCancel = () => {
  window.location.href = `./${window.location.search}`;
};

const uiSetup = () => {
  const tags = [];

  const sortedKeys = Object.keys(metadata)
    .sort()
    .map((item) => item.substring(0, 1).toUpperCase() + item.substring(1));

  const settingsStartedEmpty = settings.show.length == 0;

  for (const key of sortedKeys) {
    // get current setting.
    const metadataItem = metadata[key.toLowerCase()];
    if (settingsStartedEmpty && metadataItem.implicit !== false) {
      settings.show.push(key.toLowerCase());
    }

    const tag = key.toLowerCase();
    const selected =
      settings.show.includes(tag) ||
      (!settings.hide.includes(tag) &&
        metadata[key.toLowerCase()].implicit !== false); // second clause allows new categories to be shown by default

    if (!selected && !settings.hide.includes(tag)) {
      settings.hide.push(tag);
    }

    const itemHtml = `<label class="tag"><input class="opt" type="checkbox" onClick="handleChecked(event)" id="${tag}" ${
      selected ? "checked" : ""
    }><img class="icon" src="../markers/${tag}.png" alt="" onerror="this.style.visibility='hidden'">${key}</label>`;

    tags.push(itemHtml);
  }

  document.getElementById("tags-div").innerHTML = tags.join("\n");

  // Behaviour: "Use v2 map" sends visits to /index.html on to /v2/index.html (see the redirect in /index.html)
  const useV2 = document.getElementById("use-v2");
  useV2.checked = !!settings.useV2;
  useV2.addEventListener("change", (e) => {
    settings.useV2 = e.target.checked;
  });

  document.getElementById("cancel").addEventListener("click", handleCancel);
  document.getElementById("apply").addEventListener("click", handleApply);
};
