import * as fs from "fs";
import { PlottableItem, PlottableItemCallback } from "./types";
import { parseLocation } from "./util";

export const processTsvFile = async (fileName: string): Promise<void> => {};

const getLeafDirName = (path: string): string => {
  const nameParts = path.split("/");
  while ([".", "data", "source"].includes(nameParts[0])) {
    nameParts.shift();
  }
  return nameParts[0];
};

const processFile = async (
  fileName,
  callback: PlottableItemCallback
): Promise<void> => {
  console.log("file: " + fileName);
  const featureType = getLeafDirName(fileName);

  // next part is the actual

  const lines = fs.readFileSync(fileName).toString().split("\n");
  const columnNameMap = [];
  let columnNamesRead = false;

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();

    if (trimmedLine) {
      //convert 'strict' csv to tsv - any comma not followed by a space becomes tab.
      console.log(trimmedLine);
      const line = trimmedLine.replace(/,/g, "\t").replace(/\t /g, ", ");
      if (!columnNamesRead) {
        // header line
        columnNamesRead = true;

        const columnNames = line.split("\t");
        columnNames.forEach((name, index) => {
          columnNameMap[name] = index;
        });
      } else {
        // data line
        const fields = line.split("\t");
        console.log(JSON.stringify(fields));

        let location;
        const locationIndex = columnNameMap["location"];
        if (locationIndex > -1) {
          location = parseLocation(fields[locationIndex]);
        }

        const latitudeIndex = columnNameMap["latitude"];
        const longitudeIndex = columnNameMap["longitude"];
        if (latitudeIndex > -1 && longitudeIndex > -1) {
          location = {
            latitude: Number.parseFloat(fields[latitudeIndex]),
            longitude: Number.parseFloat(fields[longitudeIndex]),
          };
        }

        const nameIndex = columnNameMap["label"];
        let title = fields[nameIndex];

        if (location && title) {
          const item: PlottableItem = {
            latitude: location.latitude,
            longitude: location.longitude,
            title: title,
          };
          callback(item);
        }
      }
    }
  }
  console.log(`Finished processing file of [${featureType}] - ${fileName}`);
};

const processFileSet = (fileNames: string[]) => {
  if (fileNames.length) {
    const featureType = getLeafDirName(fileNames[0]);
    const fileLines: string[] = [];

    for (const fileName of fileNames) {
      processFile(fileName, (item: PlottableItem) => {
        fileLines.push(`${item.latitude}\t${item.longitude}\t${item.title}`);
      });
    }

    fs.writeFileSync(`./data/${featureType}.tsv`, fileLines.join("\n"));
  }
};

export const go = async () => {
  processFileSet([
    "./data/source/redwoods/redwoods.manual.csv",
    "./data/source/redwoods/redwoods.wikidata.csv",
  ]);
};

go();
