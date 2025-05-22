import simply from "@holdy/simply";
import * as fs from "fs";
import path from "path";

const base = "/Users/Shared/data/caching-fetch";

const getCacheFileName = (url: string): string => {
  const relative = url.replace("://", "/");

  return path.join(base, relative);
};

export const cachingDescriber = async (
  referenceUrl: string,
  input: string
): Promise<[Error, null] | [null, string]> => {
  const cacheFilename = getCacheFileName(referenceUrl);
  if (fs.existsSync(cacheFilename)) {
    console.log("Cache hit");
    return [null, fs.readFileSync(cacheFilename).toString()];
  }

  const resultSchema = simply.schema.object({
    summary: simply.schema.string(),
  });

  const [error, response] = await simply
    .getResponseTo({
      contextPrompt:
        "Describe the main details of this in a 1 or 2 sentence summary - you do not need to describe the establisment it occurs in",
      contextInput: input,
    })
    .withSchema(resultSchema)
    .fromChatGPT("gpt-4o-2024-08-06");

  if (error) {
    console.log(error);
  }

  const dir = path.dirname(cacheFilename);
  // Create the directory if it doesn't exist
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(cacheFilename, response.summary);

  return [null, response.summary];
};
