import * as path from "path";
import * as fs from "fs";

const base = "/Users/Shared/data/caching-fetch";

const getCacheFileName = (url: string): string => {
  const relative = url.replace("://", "/");

  return path.join(base, relative);
};

export const cachingFetch = async (
  url: string
): Promise<[Error, null] | [null, string]> => {
  const filePath = getCacheFileName(url);
  if (fs.existsSync(filePath)) {
    return [null, fs.readFileSync(filePath).toString()];
  }

  const response = await fetch(url);

  if (response.ok) {
    // ensure the directory
    const dir = path.dirname(filePath);
    // Create the directory if it doesn't exist
    fs.mkdirSync(dir, { recursive: true });

    const content = await response.text();
    fs.writeFileSync(filePath, content);

    return [null, content];
  } else {
    return [new Error(response.statusText), null];
  }
};
