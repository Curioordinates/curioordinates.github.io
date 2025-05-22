import * as fs from "fs";
import { cachingFetch } from "./cachingFetch";
import { ExtractedData, processHtml } from "./fieldExtractor";
import { titlesMatch } from "./fieldRecogniser";
import { title } from "process";
import { cachingDescriber } from "./cachingDescriber";

interface SplitItem {
  lines: string[];
  hasBookingLink: boolean;
}
let facebookFoundCount = 0;
const getBookingComLink = (source: string): string | null => {
  const match = /"(https:[^"]+)"/.exec(source);
  if (match) {
    return match[1];
  }

  return null;
};

const splitByLineFragments = (
  source: string,
  startFragment: string,
  endFragment: string
): SplitItem[] => {
  const result: SplitItem[] = [];
  let currentItem: SplitItem | null = null;

  for (const line of source.split("\n")) {
    if (line.indexOf(startFragment) != -1) {
      // start a new item
      currentItem = { lines: [line], hasBookingLink: false };
      result.push(currentItem);
    } else if (line.indexOf(endFragment) != -1) {
      if (currentItem) {
        currentItem.lines.push(line);
        currentItem.hasBookingLink = true;
      }
      currentItem = null;
    } else if (currentItem) {
      currentItem.lines.push(line);
    }
  }

  return result;
};

function removeComments(source: string): string {
  let workingText = source;

  while (true) {
    const commentStart = workingText.indexOf("<!--");
    if (commentStart != -1) {
      const commentEnd = workingText.indexOf("-->");
      if (commentEnd != -1) {
        workingText =
          workingText.substring(0, commentStart) +
          workingText.substring(commentEnd + 3);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return workingText;
}

let workingContent = fs.readFileSync("./paullee.hotels.html").toString();

workingContent = removeComments(workingContent);

const items = splitByLineFragments(
  workingContent,
  'class="venue"',
  "booking.com"
);

let facebookStuff = removeComments(
  fs.readFileSync("./paullee.hotels.facebook.html").toString()
);
let facebookItems = splitByLineFragments(facebookStuff, "<b>", "Distance:");
let facebookRecords = facebookItems.map((item) => {
  const [_, record] = processHtml(item.lines.join("\n"));
  return record;
});

const removeQueryString = (url: string): string => {
  const index = url.indexOf("?");
  if (index === -1) {
    return url;
  }
  return url.substring(0, index);
};
console.log(JSON.stringify(facebookRecords, null, 3));

const recordsMatch = (a: ExtractedData, b: ExtractedData): boolean => {
  if (!a || !b) {
    return false;
  }
  if (!a.address?.postcode || !b.address?.postcode) {
    return false;
  }
  const aPostcode: string = a.address.postcode;
  const bPostcode: string = b.address.postcode;
  return titlesMatch(a.title ?? "a", b.title ?? "b") && aPostcode === bPostcode;
};

const findFacebookRecord = (data: ExtractedData): ExtractedData | null => {
  let item = facebookRecords.find((testItem) => {
    if (testItem && recordsMatch(data, testItem)) {
      return true;
    }
  });

  if (!item) {
    // TODO why is this needed - when doesn't the above match?
    const postcodeMAtches = facebookRecords.filter(
      (testItem) => testItem?.address?.postcode === data.address?.postcode
    );

    console.log("Postcode only matches: " + postcodeMAtches.length);
    const titleMatches = postcodeMAtches.filter((testItem) =>
      titlesMatch(testItem?.title ?? "b", data.title ?? "a")
    );
    if (titleMatches.length) {
      return titleMatches[0];
    }
  }
  return item ?? null;
};

async function go() {
  for (const item of items) {
    if (item.hasBookingLink) {
      console.log("checking");
      const rawLink = getBookingComLink(item.lines.join("\n"));

      const [error, fields] = processHtml(item.lines.join("\n"));
      if (error) {
        console.log("Could not read fields");
        process.exit(0);
      }
      console.log("looking for fcebook entry");
      let facebookEntry = findFacebookRecord(fields);
      if (facebookEntry) {
        facebookFoundCount++;
      }

      if (rawLink) {
        const link = rawLink.replace("https:/https://", "https://");
        console.log(link);
        const [error, info] = await cachingFetch(removeQueryString(link));
        if (info) {
          const [_, coords] = findCoords(info);

          if (coords) {
            console.log(coords);
          } else {
            console.log("No coords");
            process.exit(0);
          }
          console.log("fields:" + JSON.stringify(fields, null, 3));
          console.log("facebook:" + facebookEntry);
          if (!facebookEntry) {
            // get matchingfacebooks
            /*
            const postcodeMatches = facebookRecords.filter(
              (testItem) =>
                testItem?.address?.postcode === fields.address?.postcode
            );
            console.log(JSON.stringify(postcodeMatches, null, 3));

            console.log(fields.title);
            console.log(
              "titleMatch:" +
                titlesMatch(postcodeMatches[0]?.title, fields.title)
            );

            console.log(
              "Fullmatch:" + recordsMatch(postcodeMatches[0], fields)
            );*/
            process.exit(0);
          } else {
            const html = item.lines.join("\n");
            const [error, description] = await cachingDescriber(
              `point/${coords.latitude}/${coords.longitude}.txt`,
              html
            );

            if (error) {
              console.log("Description error:" + error);
              process.exit(0);
            }

            writeLine({
              latitude: coords.latitude,
              longitude: coords.longitude,
              link: facebookEntry.urls[0],
              title: fields.title ?? "",
              description,
            });
          }
        }
      }
    }
  }
  console.log("facebookFound:" + facebookFoundCount);
}

const writeLine = ({
  latitude,
  longitude,
  title,
  description,
  link,
}: {
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  link: string;
}) => {
  const linkValue = link ?? "_";
  const line = `${latitude},${longitude},${title},${linkValue},${description}\n`;
  fs.appendFileSync("./out.txt", line);
};

const findCoords = (
  source: string
): [Error, null] | [null, { latitude: number; longitude: number }] => {
  const match = /center=([0-9\.\-]+),([0-9\.\-]+)/.exec(source);

  if (match) {
    console.log(JSON.stringify(match));
    return [null, { latitude: Number(match[1]), longitude: Number(match[2]) }];
  } else {
    console.log("null match");
  }
  return [new Error("not found"), null];
};
/*
const [error, pageContent] = await cachingFetch(
  "https://www.booking.com/hotel/gb/atholl-arms.en-gb.html"
);
*/

go();
