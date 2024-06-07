import { createHash } from "crypto";
import * as fs from "fs";

let md5Hash = (input: string) => createHash("md5").update(input).digest("hex");

export const geoLookup = async (
  query: string
): Promise<{ latitude: number; longitude: number } | {} | null> => {
  // create hash key
  const cacheKey = md5Hash(query.toLowerCase());

  const cacheDirectoryName = `/Users/Shared/data/geocode-cache/${cacheKey.substring(
    0,
    4
  )}`;
  const cacheFileName = `${cacheDirectoryName}/${cacheKey}.json`;
  if (fs.existsSync(cacheFileName)) {
    const json = JSON.parse(fs.readFileSync(cacheFileName).toString());
    return json;
  }

  const uri = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=jsonv2`;
  const result = await fetch(uri, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (result.ok) {
    const json = await result.json();
    const jsonToWrite =
      json.length === 0
        ? {}
        : {
            latitude: Number(json[0].lat),
            longitude: Number(json[0].lon),
            full_address: json[0].display_name,
            place_id: json[0].place_id,
            osm_id: json[0].osm_id,
          };
    fs.mkdirSync(cacheDirectoryName, { recursive: true });
    fs.writeFileSync(cacheFileName, JSON.stringify(jsonToWrite));
    return jsonToWrite;
  } else {
    return null;
  }
};
