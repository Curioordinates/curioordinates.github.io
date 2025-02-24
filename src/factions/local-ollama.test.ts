import * as fs from "fs";
import * as path from "path";
import {
  callLLM,
  callLLMStructured,
  getMentionedLocations,
} from "./local-ollama";
import { NamedThingListSchema, locationListSchema } from "./local-ollama-types";
import { namedEntityExtraction, narremeExtraction } from "./text-extractor";

describe("Local-Ollama", () => {
  jest.setTimeout(99999);

  it("should work", async () => {
    // given
    const fairyArticle = fs
      .readFileSync(path.join(__dirname, "local-ollama-target.txt"))
      .toString();

    // when
    const result = await getMentionedLocations(fairyArticle);

    // then
    console.log(JSON.stringify(result, null, 3));
  });

  jest.setTimeout(9999999);

  it("helps build wiki", async () => {
    jest.setTimeout(9999999);
    // given
    const fileName =
      "/Users/chris/projects/info-web/data/source/s1/The Fairies' Caldron.txt";
    const targetText = fs.readFileSync(fileName).toString();

    const [error, entityResult] = await namedEntityExtraction(targetText);
    const [error2, narremeResult] = await narremeExtraction(targetText);
    console.log(entityResult);
  });

  it("extracts structured location data", async () => {
    // given
    const targetText = fs
      .readFileSync(path.join(__dirname, "local-ollama-target.txt"))
      .toString();

    // when
    const startTime = Date.now();
    const [error, result] = await callLLMStructured(
      `List all locations mentioned in the following text. 
                The location should be returned as 'locationName'. Guessing the location type, e.g. (village, mountain, town, country) is ok.`,
      targetText,
      locationListSchema
    );
    const timeTaken = Date.now() - startTime;
    console.log(`took ${timeTaken / 1000} seconds`);

    // then
    console.log(JSON.stringify(result, null, 3));
  });

  it("should recognise password policy", async () => {
    // given
    const targetText = fs
      .readFileSync(path.join(__dirname, "local-ollama-password.txt"))
      .toString();

    // when
    const result = await callLLM(
      "Considering ISO 27001, which ISO area does the following text address:",
      targetText
    );

    // then
    console.log(JSON.stringify(result, null, 3));
  });
});
