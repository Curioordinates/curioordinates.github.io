const latLongRegex = / *\d+\.\d+ *, *\d+\.\d */;

export const parseLocation = (
  text: string
): { latitude: number; longitude: number } => {
  if (text.startsWith("Point(")) {
    console.log("recognizsed poit");
    const components = text
      .substring(6)
      .replace(")", "")
      .split(" ")
      .filter((item) => !!item);
    console.log("Components:" + JSON.stringify(components));
    return {
      latitude: Number(components[1]),
      longitude: Number(components[0]),
    };
  } else if (latLongRegex.test(text)) {
    const parts = text.split(",").map((part) => Number.parseFloat(part.trim()));
    return { latitude: parts[0], longitude: parts[1] };
  } else {
    throw new Error("Location type not handled: " + text);
  }
};
