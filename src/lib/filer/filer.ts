import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import nat from "../nat";

const splitOnFour = (text: string): [string, string] => [
  text.substring(0, 4),
  text.substring(4),
];

const baseDataDirectory = "/Users/Shared/data/keyjson";

/**
 *  store a json object against a string
 *  - if item exists - fields will overwrite
 */
export const store = (
  text: string,
  object: { [key: string]: string | number | boolean }
) => {
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

  fs.mkdirSync(path.join(...dirPath), { recursive: true });

  const fileName = path.join(
    ...dirPath,
    `${encodeURIComponent(cleanString)}.json`
  );

  if (fs.existsSync(fileName)) {
    const existingObject = JSON.parse(fs.readFileSync(fileName).toString());

    fs.writeFileSync(
      fileName,
      JSON.stringify({
        ...existingObject,
        ...object, // New object fields overwrite old.
      })
    );
  } else {
    // write new file.
    fs.writeFileSync(fileName, JSON.stringify(object));
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
