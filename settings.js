const settingsString = localStorage.getItem("settings");

const settings = settingsString ? JSON.parse(settingsString) : { enabled: [] };

let metadata;
const setup = async () => {
  const response = await fetch("./src/metadata.json");
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
  if (checked && !settings.enabled.includes(tag)) {
    settings.enabled.push(tag);
  }

  if (!checked && settings.enabled.includes(tag)) {
    settings.enabled = settings.enabled.filter((testItem) => testItem !== tag);
  }

  console.log(JSON.stringify(settings));
};

const handleApply = () => {
  localStorage.setItem("settings", JSON.stringify(settings));
  handleCancel();
};

const handleCancel = () => {
  window.location.href = "/";
};

const uiSetup = () => {
  const tags = [];

  const sortedKeys = Object.keys(metadata)
    .sort()
    .map((item) => item.substring(0, 1).toUpperCase() + item.substring(1));

  const settingsStartedEmpty = settings.enabled.length == 0;

  for (const key of sortedKeys) {
    // get current setting.
    const metadataItem = metadata[key.toLowerCase()];
    if (settingsStartedEmpty && metadataItem.implicit !== false) {
      settings.enabled.push(key.toLowerCase());
    }

    const tag = key.toLowerCase();
    const selected = settings.enabled.includes(tag);

    const itemHtml = `<div><input class="opt" type="checkbox" onClick="handleChecked(event)" id="${tag}" ${
      selected ? "checked" : ""
    }>${key}</div>`;

    tags.push(itemHtml);
  }

  document.getElementById("tags-div").innerHTML = tags.join("\n");

  document.getElementById("cancel").addEventListener("click", handleCancel);
  document.getElementById("apply").addEventListener("click", handleApply);
};