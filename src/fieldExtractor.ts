import { fieldRecogniser } from "./fieldRecogniser";
import { toTextAndTags } from "./textAndTags";

export interface ExtractedData {
  address?: {
    lines: string[];
    postcode: string | null;
  };
  title?: string;
  urls: string[];
}

export const processHtml = (
  source: string
): [Error, null] | [null, ExtractedData] => {
  const [error, items] = toTextAndTags(source);

  if (error) {
    return [error, null];
  }
  const result: ExtractedData = {
    urls: [],
  };

  for (const item of items) {
    if (item.type == "text") {
      const x = fieldRecogniser(item.value);
      if (x.type === "address") {
        result.address = x;
      } else if (x.type === "title") {
        result.title = x.value;
      }
    } else if (item.type === "tag") {
      // get any url
      const match = /"(https:[^"]+)"/.exec(source);
      if (match) {
        const url = match[1];
        if (!result.urls.includes(url)) {
          result.urls.push(url);
        }
      }
    }
  }

  return [null, result];
};
