import * as fs from "fs";
import * as path from "path";
import { ttdExpand } from "./lib/text-to-data/api";
import { PlottableItem, PlottableItemCallback } from "./types";
import { parseLocation } from "./util";
import { recurseDirectories } from "./recurseDirectories";
import { to5DP } from "./lib/number-utils";
import { findSourceMap } from "module";
import { parseLine } from "./lib/data-extractor";
import {
  getNamedCountersAsMap,
  incrementNamedCounter,
} from "./lib/namedCounters";

export const processTsvFile = async (fileName: string): Promise<void> => {};

/**
 * key is {latitude}:{longitude}
 */
const hitMap: Record<string, string> = {};

const addSurveyLink = false;

const getLeafDirName = (path: string): string => {
  const nameParts = path.split("/");
  while ([".", "data", "source"].includes(nameParts[0])) {
    nameParts.shift();
  }
  return nameParts[0];
};

export const processFile = async (
  fileName,
  callback: PlottableItemCallback
): Promise<void> => {
  console.log("file: " + fileName);
  //const featureType = getLeafDirName(fileName);

  // next part is the actual

  const lines = fs.readFileSync(fileName).toString().split("\n");
  const columnNameMap = [];
  let columnNamesRead = false;

  const isTsvFile = fileName.endsWith(".tsv");

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();

    if (trimmedLine) {
      //convert 'strict' csv to tsv - any comma not followed by a space becomes tab.
      console.log(trimmedLine);
      const line = isTsvFile
        ? trimmedLine
        : trimmedLine
            .replace(/,/g, "\t")
            .replace(/\t /g, ", ")
            .replace(/\t_/g, ",_"); // This specifically covers comma+underscore in wikipedia-link-slugs

      if (!columnNamesRead) {
        // header line
        columnNamesRead = true;

        const columnNames = line.split("\t");
        columnNames.forEach((name, index) => {
          columnNameMap[name] = index;
        });
      } else {
        const extractedData = parseLine({ line });
        /*
        // data line
        const fields = line.split("\t");
        console.log(JSON.stringify(fields));

        let location;
        const locationIndex = columnNameMap["location"];
        if (locationIndex > -1) {
          location = parseLocation(fields[locationIndex]);
        }

        const latitudeIndex =
          columnNameMap["latitude"] ?? columnNameMap["@lat"];
        const longitudeIndex =
          columnNameMap["longitude"] ?? columnNameMap["@lon"];
        if (latitudeIndex > -1 && longitudeIndex > -1) {
          location = {
            latitude: Number.parseFloat(fields[latitudeIndex]),
            longitude: Number.parseFloat(fields[longitudeIndex]),
          };
        }

        const nameIndex = columnNameMap["label"] ?? columnNameMap["name"];
        let title = fields[nameIndex];
*/
        // if (location && title) {
        if (
          (extractedData.latitude || extractedData.latitude === 0) &&
          (extractedData.longitude || extractedData.longitude === 0) &&
          extractedData.title
        ) {
          const title = decodeURIComponent(extractedData.title);
          const latitude = to5DP(extractedData.latitude!);
          const longitude = to5DP(extractedData.longitude!);
          const surveyLink = `http://localhost:8000/?l=${extractedData.latitude},${extractedData.longitude}&z=18&satellite`;
          let link = extractedData.link ?? null;

          if (link && link.includes("wikidata.org/entity/")) {
            incrementNamedCounter("wikidata-entity-links");

            if (!fileName.includes("barrow")) {
              const lastSlash = link.lastIndexOf("/");
              if (lastSlash !== -1) {
                const q_id = link.substring(lastSlash + 1);
                // There might be a wikipedia article about the entity - which would be much better than a wikidata page.
                const expand = await ttdExpand(q_id);
                if (expand && expand.about_url_english) {
                  incrementNamedCounter("wikidata-entity-upgrade");
                  link = expand.about_url_english;
                }
              }
            }
          }

          const item: PlottableItem = {
            latitude,
            longitude,
            title,
            surveyLink,
            link,
            details: extractedData.details ?? null,
          };
          callback(item);
        }
      }
    }
  }
  console.log(`Finished processing ${fileName}`);
};

let stopHits = 0;

const processFileSet = async (
  directoryName: string,
  fileNames: string[],
  featureType: string,
  params: Record<string, string | number>
): Promise<number> => {
  const verifiedFileNames = fileNames.filter((name) =>
    name.includes("verified")
  );
  const fileLines: string[] = [];
  if (fileNames.length) {
    //    const featureType = getLeafDirName(fileNames[0]);
    for (const fileName of fileNames) {
      const isVerifiedFile = fileName.includes("verified");
      await processFile(fileName, (item: PlottableItem) => {
        const isListedInStops = stops.find(
          (testStop) =>
            testStop.latitude == item.latitude &&
            testStop.longitude == item.longitude
        );

        if (isListedInStops) {
          stopHits++;
          return;
        }

        // see if its defined lower
        const hitKey = `${to5DP(item.latitude)}:${to5DP(item.longitude)}`;
        console.log("made hit key :" + hitKey);
        const hitSourceDirectory = hitMap[hitKey];

        console.log(`testing: ${hitSourceDirectory} against ${directoryName}`);
        if (
          hitSourceDirectory &&
          hitSourceDirectory.startsWith(directoryName)
        ) {
          // defined lower so ignore this item
          console.log("ignoring item in favour of " + hitSourceDirectory);

          return;
        }
        hitMap[hitKey] = directoryName;

        if (params.name_all && !isVerifiedFile) {
          item.title = params.name_all.toString();
        }
        if (
          verifiedFileNames.length > 0 &&
          !verifiedFileNames.includes(fileName)
        ) {
          // anything not in the verified file is unverified.
          // item.title += " (unverified)";
        }

        const lineParts: (string | number)[] = [
          item.latitude,
          item.longitude,
          item.title,
        ];
        if (item.link) {
          lineParts.push(item.link);
        } else {
          if (item.details) {
            lineParts.push("-"); // Only need padding if something is coming after.
          }
        }
        if (item.details) {
          lineParts.push(item.details);
        }
        if (addSurveyLink) {
          lineParts.push(item.surveyLink);
        }
        fileLines.push(lineParts.join("\t"));
      });
    }

    fs.writeFileSync(`./data/cells/${featureType}.tsv`, fileLines.join("\n"));
  }
  return fileLines.length;
};

const processDirectory = async (
  directoryName: string,
  featureType: string,
  params: Record<string, string | number>
): Promise<number> => {
  const items = fs.readdirSync(directoryName);

  const targetItems = items
    .filter((item) => item.endsWith(".csv") || item.endsWith(".tsv"))
    .map((item) => path.join(directoryName, item));
  console.log(targetItems);
  return processFileSet(directoryName, targetItems, featureType, params);
};

const stops: { latitude: number; longitude: number }[] = [];

export const go = async () => {
  const builtMetadata = {};

  await processFile("./data/source/_stops/_stops.tsv", (item) => {
    stops.push(item);
    console.log(`STOP : ` + JSON.stringify(item));
  });

  await recurseDirectories({
    rootDirectory: "./data/source",
    callback: async (foundDirectory) => {
      if (foundDirectory.directoryPath.includes("_stops")) {
        return; // stops are handled elsewhere.
      }

      let metadata = {
        count: 0,
      };
      const keyName =
        foundDirectory.relativeSteps[foundDirectory.relativeSteps.length - 1];
      try {
        const fileContent = fs
          .readFileSync(
            path.join(foundDirectory.directoryPath, `${keyName}.metadata.json`)
          )
          .toString();

        metadata = JSON.parse(fileContent);
      } catch (_) {} // No metadata file

      builtMetadata[keyName] = metadata;

      console.log("DIRECTORY: " + foundDirectory.directoryPath);
      console.log("META: " + JSON.stringify(metadata));

      const itemCount = await processDirectory(
        foundDirectory.directoryPath,
        keyName,
        metadata
      );

      metadata.count = itemCount;
    },
  });

  fs.writeFileSync(
    "./src/metadata.json",
    JSON.stringify(builtMetadata, null, 3)
  );

  /*
  const metadata = JSON.parse(
    fs.readFileSync(path.join(__dirname, "./metadata.json")).toString()
  );

  for (const [key, untypedData] of Object.entries(metadata)) {
    const data = untypedData as Record<string, string>;
    console.log(key);
    console.log(JSON.stringify(data, null, 3));
    processDirectory(`./data/source/${key}/`, data);
  }
*/

  const namedCounterMap = getNamedCountersAsMap();
  console.log(JSON.stringify(namedCounterMap, null, 3));

  console.log("Stop hits :" + stopHits);
};

go();
