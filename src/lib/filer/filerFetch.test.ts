import { callLLMStructured } from "../text-to-data/local-ollama";
import {
  locationListSchema,
  twoSummaryLinesSchema,
} from "../text-to-data/local-ollama-types";
import { load, store } from "./filer";
import { filerFetchContent } from "./filerFetch";
import * as fs from "fs";
import * as path from "path";
import { convert } from "html-to-text";
import { FilerAppender } from "./filerAppender";

describe("filerFetch", () => {
  jest.setTimeout(99999999);
  it("should work", async () => {
    const urls = fs
      .readFileSync(path.join(__dirname, "urlList.txt"))
      .toString()
      .split("\n");

    let itemCount = 0;
    for (const url of urls) {
      console.log(`${++itemCount} / ${urls.length}`);
      try {
        const [error, pageContent] = await filerFetchContent(url);
        if (error) {
          console.log(error);
          continue;
        }

        const titleHit = pageContent.match(/<title>(.*)<\/title>/);
        if (titleHit) {
          let title = titleHit[1];
          const pipeIndex = title.indexOf("|");
          if (pipeIndex != -1) {
            title = title.substring(0, pipeIndex).trim();
          }
          console.log(`title: [${title}]`);

          const [_, existingData] = load(title);
          const data: any = { ...(existingData ?? {}) };

          writeDataIfGood(data);

          data.aboutUrl = url;
          data.title = title;
          store(title, data);

          let plaintext = convert(pageContent);
          const chopIndex = plaintext.indexOf("YOU MIGHT ALSO LIKE");
          if (chopIndex != -1) {
            plaintext = plaintext.substring(0, chopIndex);
          }

          if (
            !data.locations &&
            !(data.locations && data.locations.length === 0)
          ) {
            console.log(plaintext);
            const [error, result] = await callLLMStructured(
              "llama3.1:8b",
              `List the geographic locations mentioned in the following text. 
              The location should be returned as 'locationName'. Guessing the location type, e.g. (village, mountain, town, country) is ok.`,
              plaintext,
              locationListSchema
            );
            if (error) {
              console.error(error);
              continue;
            }

            data.locations = result;
            store(title, data);
          }

          if (data.locations && data.locations.length > 0) {
            // use llama3.2 (quick summarisation)
            if (!data.summaryLines) {
              const [error, summaryLines] = await callLLMStructured(
                "llama3.2",
                `Give a 2 sentence description of ${title}:`,
                plaintext,
                twoSummaryLinesSchema
              );
              if (error) {
                console.error(error);
                continue;
              }

              data.summaryLines = [
                summaryLines.sentence1,
                summaryLines.sentence2,
              ];

              store(title, data);
            }
          }
        }
      } catch (e) {
        //continue
      }
    }
  });
});

const appender = new FilerAppender(path.join(__dirname, "yokai.com.txt"));

const writeDataIfGood = (data): void => {
  if (data.summaryLines && data.summaryLines.length > 1) {
    if (
      data.title &&
      data.aboutUrl &&
      data.locations &&
      data.locations.length > 0
    ) {
      const noCommaTitle = data.title.replace(/,/g, ";");
      appender.appendLines(
        "",
        JSON.stringify(data.locations),
        `xxxxxx,${noCommaTitle},${data.aboutUrl},${data.summaryLines.join(" ")}`
      );
    }
  }
};
