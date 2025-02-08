import { load, store } from "../filer/filer";
import { filerFetchContent } from "../filer/filerFetch";
import { resolveRHS } from "../resolver";

export type ResponsePair<DataType> = [Error] | [null, DataType] | [Error, null];

export const titleCase = (input: string): string => {
  const parts = input.split(" ");
  return parts
    .map(
      (part) =>
        `${part.substring(0, 1).toUpperCase()}${part
          .substring(1)
          .toLowerCase()}`
    )
    .join(" ");
};

const getWikiTryNames = async (
  name: string
): Promise<ResponsePair<{ content: string; title: string } | null>> => {
  const [error, content] = await tryGetWikipediaPage(titleCase(name));

  if (content) {
    return [null, { content, title: titleCase(name) }];
  }

  const [error2, content2] = await tryGetWikipediaPage(name);

  if (content2) {
    return [null, { content: content2, title: name }];
  }
  return [error2, null];
};

export const getNamely = async (
  name: string
): Promise<ResponsePair<{ [key: string]: any }>> => {
  const [errorFromClean, cleanPhraseWrapper] = await resolveRHS(
    name,
    "formatted-phrase"
  );

  if (errorFromClean) {
    return [errorFromClean];
  }

  const [_, existingData] = load(cleanPhraseWrapper.value);
  const data: any = { ...(existingData ?? {}) };

  if (!data.sources) {
    data.sources = {};
  }

  // ensure wikipedia
  if (!data.sources.hasOwnProperty("wikipedia.org")) {
    const [error, pageContentWrapper] = await getWikiTryNames(
      cleanPhraseWrapper.value
    );
    if (error) {
      console.log(error);
      if (error.message === "Not Found") {
        data.sources["wikipedia.org"] = null;
        await store(cleanPhraseWrapper.value, data);
      }
    } else if (pageContentWrapper === null) {
      data.sources["wikipedia.org"] = null;
      await store(cleanPhraseWrapper.value, data);
    } else {
      data.sources["wikipedia.org"] = pageContentWrapper.title;
      // we got some content - get the wikidata id.
      const [idError, idValue] = await getWikidataIdFromPageTitle(
        pageContentWrapper.title
      );
      if (idError) {
        console.log(idError);
      } else if (idValue === null) {
        data.sources["wikidata.org"] = null;
        await store(cleanPhraseWrapper.value, data);
      } else {
        data.sources["wikidata.org"] = idValue;

        // try coords for good luck
        const [errorFromCoords, coords] = await getWikidataLocationFromQID(
          idValue
        );
        if (errorFromCoords) {
          console.log(errorFromCoords);
        } else {
          const wikidata = data["wikidata.org"] ?? {};
          data["wikidata.org"] = wikidata;
          wikidata.location = coords; // null or value;
        }
        await store(cleanPhraseWrapper.value, data);
      }
    }
  }

  return [null, data];
};

export const tryGetWikipediaPage = async (
  name: string
): Promise<ResponsePair<string | null>> => {
  const cleanPhraseWrapper = {
    value: name.replace(/ +/g, " ").trim(),
  };

  const possibleUrl = `https://wikipedia.org/wiki/${cleanPhraseWrapper.value.replace(
    / +/g,
    "_"
  )}`;

  const [error, pageContent] = await filerFetchContent(possibleUrl);

  if (error && error.message === "Not Found") {
    // try casing
    const parts = cleanPhraseWrapper!.value.split(" ");
    const cased = parts
      .map(
        (part) =>
          `${part.substring(0, 1).toUpperCase()}${part
            .substring(1)
            .toLowerCase()}`
      )
      .join("_");
    return await filerFetchContent(`https://wikipedia.org/wiki/${cased}}`);
  }

  if (error) {
    return [error];
  }

  return [null, pageContent];
};

export const getWikidataIdFromPageTitle = async (
  pageTitle: string
): Promise<ResponsePair<string | null>> => {
  const queryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&format=json&redirects=1&titles=${encodeURIComponent(
    pageTitle.toLowerCase()
  )}`;

  const response = await fetch(queryUrl);

  if (response.ok) {
    const json = await response.json();
    if (json.query && json.query.pages) {
      const firstKey = Object.keys(json.query.pages)[0];
      const item = json.query.pages[firstKey];
      if (item.pageprops && item.pageprops.wikibase_item) {
        return [null, item.pageprops.wikibase_item];
      }
    }
    return [null, null];
  } else {
    return [new Error((await response).statusText)];
  }
};

export const getWikidataLocationFromQID = async (
  qid: string
): Promise<
  ResponsePair<{
    latitude: number;
    longitude: number;
    altitude?: any;
  } | null>
> => {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${qid}&property=P625`;

  const response = await fetch(url);
  if (response.ok) {
    const json = await response.json();

    if (json.claims && json.claims.P625) {
      const wrapper = json.claims.P625;
      for (const item of wrapper) {
        const fields = item.mainsnak!.datavalue!.value;
        if (fields && fields.latitude && fields.longitude) {
          //TODO what about zero
          return [
            null,
            {
              latitude: fields.latitude,
              longitude: fields.longitude,
              altitude: fields.altitude,
            },
          ];
        }
      }
    }
    return [null, null];
  } else {
    return [new Error((await response).statusText)];
  }
};
