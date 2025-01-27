import { load, store } from "./filer";

export const filerFetchContent = async (
  rawUrl: string
): Promise<[Error, null] | [null, string]> => {
  const url = rawUrl.replace(/\/$/, ""); // remove trailing slash.
  const [error, data] = load(url);

  if (error) {
    return [error, null]; // Error reading from the file store
  }

  if (data && data.error) {
    // url not valid etc
    return [new Error(data.error.toString()), null];
  }

  if (data && data.content) {
    // We have cached content!
    return [null, data.content.toString()];
  }

  // no cached data
  const response = await fetch(url);

  if (!response.ok) {
    const errorMessage = response.statusText;
    store(url, { error: errorMessage });
    return [new Error(errorMessage), null];
  }

  const content = await response.text();
  store(url, { content });
  return [null, content];
};

async function go() {
  const url = "https://yokai.com/hamagurinyoubou/";
  const data = await filerFetchContent(url);
}

go();
