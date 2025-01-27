import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import nat from "../nat";

const splitOnFour = (text: string): [string, string] => [
  text.substring(0, 4),
  text.substring(4),
];

const baseDataDirectory = "/Users/Shared/data/keyjson";

const makePaths = (text: string): { dirPath: string[]; filePath: string } => {
  const cleanString = text.toLowerCase().trim();

  const sixtyfour = crypto
    .createHash("md5")
    .update(cleanString)
    .digest("base64");

  let [part1, rest] = splitOnFour(sixtyfour);
  let [part2, rest2] = splitOnFour(rest);
  let [part3] = splitOnFour(rest2);
  const dirPath = [
    baseDataDirectory,
    encodeURIComponent(part1),
    encodeURIComponent(part2),
    encodeURIComponent(part3),
  ];
  const filePath = path.join(
    ...dirPath,
    `${encodeURIComponent(cleanString)}.json`
  );

  console.log(filePath);
  return { dirPath, filePath };
};

export const load = (
  text: string
):
  | [Error, null]
  | [null, { [key: string]: string | number | boolean } | null] => {
  const paths = makePaths(text);

  if (fs.existsSync(paths.filePath)) {
    const data = JSON.parse(fs.readFileSync(paths.filePath).toString());
    return [null, data];
  } else {
    // No error, its just not present
    return [null, null];
  }
};

/**
 *  store a json object against a string
 *  - if item exists - fields will overwrite
 */
export const store = (
  text: string,
  object: { [key: string]: string | number | boolean }
) => {
  const paths = makePaths(text);

  fs.mkdirSync(path.join(...paths.dirPath), { recursive: true });

  if (fs.existsSync(paths.filePath)) {
    const existingObject = JSON.parse(
      fs.readFileSync(paths.filePath).toString()
    );

    fs.writeFileSync(
      paths.filePath,
      JSON.stringify({
        ...existingObject,
        ...object, // New object fields overwrite old.
      })
    );
  } else {
    // write new file.
    fs.writeFileSync(paths.filePath, JSON.stringify(object));
  }

  //  console.log(sixtyfour);
  //  console.log(dirPath);
};

const go = async () => {
  for (let i of nat.sequence("1499 to 2000")) {
    const url = `https://whc.unesco.org/en/list/${i}`;
    const response = await fetch(url);
    console.log("trying: " + url);
    if (response.ok) {
      const text = await response.text();

      const titleHit = text.match(/<title>(.*)<\/title>/);
      if (titleHit) {
        console.log("tt" + titleHit[1]);
        const title = titleHit[1];
        const unescIndex = title.indexOf(" - UNESCO");
        if (unescIndex != -1) {
          const cleanTitle = title.substring(0, unescIndex).trim();

          const object = {
            "unesco.org": url,
          };
          store(cleanTitle, object);
          console.log("stored : " + cleanTitle);
        }
      }
    }
  }
};
//go();
