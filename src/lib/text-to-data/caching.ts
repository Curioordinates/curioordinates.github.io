import * as fs from "fs";

const httpCachePath = "/Users/Shared/data/cache";

export const makeAbsoluteCacheFileName = (relativeCacheFileName: string): string => {
    const cacheFilePath = `${httpCachePath}/${relativeCacheFileName.replace(
        "://",
        "/"
    )}`;
    const encodedPathParts = cacheFilePath
        .split("/")
        .map((part) => encodeURIComponent(part));
    const cleanCacheFilePath = encodedPathParts.join("/");

    return cleanCacheFilePath;
};

export const attemptGetCacheFile = (
    relativeCacheFileName: string
): string | null => {
    const cleanCacheFilePath = makeAbsoluteCacheFileName(relativeCacheFileName);

    if (fs.existsSync(cleanCacheFilePath)) {
        return fs.readFileSync(cleanCacheFilePath).toString();
    }

    return null; // no cache file
};

export const writeCacheFile = (
    relativeCacheFileName: string,
    content: string
): void => {
    const cleanCacheFilePath = makeAbsoluteCacheFileName(relativeCacheFileName);
    fs.writeFileSync(cleanCacheFilePath, content);
};
