import { filerFetchContent } from "../filer/filerFetch";
import { resolveRHS } from "../resolver";

export type ResponsePair<DataType> = [Error] | [null, DataType];

export const tryGetWikipediaPage = async (
  name: string
): Promise<ResponsePair<string | null>> => {
  const [_, cleanPhraseWrapper] = await resolveRHS(name, "formatted-phrase");

  const possibleUrl = `https://wikipedia.org/wiki/${cleanPhraseWrapper.value
    .toLowerCase()
    .replace(/ /g, "_")}`;

  const [error, pageContent] = await filerFetchContent(possibleUrl);

  if (error) {
    return [error];
  }

  return [null, pageContent];
};
