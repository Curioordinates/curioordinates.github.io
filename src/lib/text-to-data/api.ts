import * as fs from "fs";
import { OPTION_SKIP_WIKIDATA_EXPANSION } from "../../options";

const WIKIDATA_CONCEPT_ID_REGEX = /^q\d+$/;

export interface ExpandedData {
  success: boolean;
  place?: {
    latitude: number;
    longitude: number;
  };
  label_english?: string;
  about_url_english?: string;
  stepLog: string[];
}

const httpCachePath = "/Users/Shared/data/cache";

export const find_meta_tag_source = (data: string): string[] => {
  // Regular expression to match tag
  const urlRegex = /<meta\b[^>]*>/gi;

  // Match the string against the regex
  const matches = data.match(urlRegex);

  // Return the matches or an empty array if no matches found
  return matches || [];
};

export const find_all_urls = (data: string): string[] => {
  // Regular expression to match URLs
  const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;

  // Match the string against the regex
  const matches = data.match(urlRegex);

  // Return the matches or an empty array if no matches found
  return matches || [];
};

export const httpGetJsonWithCache = async (
  url: string,
  stepLog?: string[]
): Promise<{ [key: string]: any } | null> => {
  const cacheFilePath = `${httpCachePath}/${url.replace("://", "/")}`;

  const encodedPathParts = cacheFilePath
    .split("/")
    .map((part) => encodeURIComponent(part));
  const cleanCacheFilePath = encodedPathParts.join("/");

  if (fs.existsSync(cleanCacheFilePath)) {
    if (stepLog) {
      stepLog.push("Cache file exists :" + cleanCacheFilePath);
    }

    const data = JSON.parse(fs.readFileSync(cleanCacheFilePath).toString());
    //console.log('loaded:' + JSON.stringify(data));
    return data;
  } else {

    if (stepLog) {
      stepLog.push("No cache file exists :" + cleanCacheFilePath);
    }
    if (OPTION_SKIP_WIKIDATA_EXPANSION) {
     console.log('OPTION_SKIP_WIKIDATA_EXPANSION is true - skipping fetch');
      return null;
    }

    const response = await fetch(url);
    // pause 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));


    if (response.ok) {
      const json = await response.json();
      const directoryPath = encodedPathParts.slice(0, -1); //  Remove file part
      fs.mkdirSync(directoryPath.join("/"), { recursive: true });
      fs.writeFileSync(cleanCacheFilePath, JSON.stringify(json, null, 3));
      return json;
    } else {
      console.log(` ->Failed to fetch ${url} - ${response.statusText} xxxxxxxxxxxxxxxxxxxxxx`);
    }

    return null;
  }
};

export const httpGetTextWithCache = async (
  url: string,
  stepLog?: string[]
): Promise<string | null> => {
  const cacheFilePath = `${httpCachePath}/${url.replace("://", "/")}`;

  const encodedPathParts = cacheFilePath
    .split("/")
    .map((part) => encodeURIComponent(part));
  const cleanCacheFilePath = encodedPathParts.join("/");

  console.log(cleanCacheFilePath);

  if (fs.existsSync(cleanCacheFilePath)) {
    if (stepLog) {
      stepLog.push("Cache file exists :" + cleanCacheFilePath);
    }
    console.log("Cache file exists :" + cleanCacheFilePath);

    const textData = fs.readFileSync(cleanCacheFilePath).toString();
    //console.log('loaded:' + JSON.stringify(data));
    return textData;
  } else {
    if (stepLog) {
      stepLog.push("No cache file exists :" + cleanCacheFilePath);
    }
    console.log("No cache file exists :" + cleanCacheFilePath);
    const response = await fetch(url);
    if (response.ok) {
      const textData = await response.text();
      const directoryPath = encodedPathParts.slice(0, -1); //  Remove file part
      fs.mkdirSync(directoryPath.join("/"), { recursive: true });
      fs.writeFileSync(cleanCacheFilePath, JSON.stringify(textData, null, 3));
      return textData;
    } else {
      console.log(` ->Failed to fetch ${url} - ${response.statusText} XXXXXXXXXXXXXXXXXXXXXXX`);
    }

    return null;
  }
};

export const openstreetmapLookup = async (
  address: string
): Promise<ExpandedData> => {
  const stepLog: string[] = [];
  let success = false;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    address
  )}&format=json&addressdetails=1&limit=1&polygon_svg=1`;

  const data = (await httpGetJsonWithCache(url, stepLog)) ?? {};

  if (data.length > 0 && (data[0].lat || data[0].lon)) {
    success = true;
    return {
      success,
      stepLog,
      place: {
        latitude: data[0].lat,
        longitude: data[0].lon,
      },
    };
  }

  return {
    success,
    stepLog,
  };
};

/**
 * Attempts to identify and expand the text input.
 * Eg for a wikidata id 'Q42' - will see if there is a web page etc.
 */
export const ttdExpand = async (text: string): Promise<ExpandedData> => {
  const lowercaseText = text.toLowerCase();
  const stepLog: string[] = [];
  let success = false;

  //console.log('go')
  if (lowercaseText.match(WIKIDATA_CONCEPT_ID_REGEX)) {
    //console.log('go1')
    stepLog.push("Assuming this is a wikidata.org concept id");

    const dataUrl = `https://www.wikidata.org/wiki/Special:EntityData/${text.toUpperCase()}.json`;


    const data = await httpGetJsonWithCache(dataUrl, stepLog);

    if (data === null) {
      stepLog.push("Null from wiki-get");
      return {
        success,
        stepLog,
      };
    }


    const entity = data.entities[text.toUpperCase()];
    const labels = entity?.labels?.en;
    let label_english;
    if (labels && labels.en) {
      label_english = labels.en[0].value;
    }
    let about_url_english: string | null = null;

    if (
      entity &&
      entity.sitelinks &&
      entity.sitelinks.enwiki &&
      entity.sitelinks.enwiki.url
    ) {
      about_url_english = entity.sitelinks!.enwiki!.url;
    }

    return {
      success: true,
      label_english,
      ...(about_url_english ? { about_url_english } : {}),
      stepLog,
    };
  } else if (lowercaseText.includes("maps.app.goo.gl")) {
    let place;
    let about_url_english;
    let label_english;

    // Google maps place.
    // try and expand it.
    stepLog.push("Assuming this is a google place URI");
    const textData = await httpGetTextWithCache(text, stepLog);

    // get lat long
    const latLongMatch = textData?.match(/\/@(-?[\d\.]+),(-?[\d\.]+),/);

    if (latLongMatch) {
      const latitude = Number(latLongMatch[1]);
      const longitude = Number(latLongMatch[2]);
      place = { latitude, longitude };
      console.log(`Lat long - ${latitude} ${longitude}`);
      success = true;
    } else {
      console.log("No lat-long match");
    }

    const urls = find_all_urls(textData!)
      .filter(
        (item) =>
          !item.includes("google") &&
          !item.includes("gstatic.com") &&
          !item.includes("schema.org")
      )
      .map((item) => {
        const backslashIndex = item.indexOf("\\\\\\");
        if (backslashIndex != -1) {
          return item.substring(0, backslashIndex);
        }
        return item;
      });
    //        console.log(JSON.stringify(urls,null,3));
    if (urls[0]) {
      about_url_english = urls[0];
    }

    const metaTags = find_meta_tag_source(textData!).filter((item) =>
      item.includes("og:title")
    );
    if (metaTags.length > 0) {
      const stringPart = metaTags[0].substring(metaTags[0].indexOf('"') + 1);
      const allString = stringPart.split('"')[0];
      label_english = allString.split("·")[0].trim();
    }

    return {
      success,
      label_english, // may be undefined
      place, // may be undefined
      about_url_english, // may be undefined
      stepLog,
    };

    //  console.log(textData);
  } else {
    stepLog.push("Did not recognize the data");
  }

  return {
    success: false, // will currently be false - because nothing is implemented right now.
    stepLog,
  };
};
