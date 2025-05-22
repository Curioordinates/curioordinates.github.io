import { title } from "process";

export type RecogniserResult =
  | {
      type: "address";
      lines: string[];
      postcode: string | null;
    }
  | {
      type: "title";
      value: string;
    }
  | {
      type: "unknown";
    };

const postcodeRegex =
  /^([Gg][Ii][Rr] 0[Aa]{2})|^((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9]?[A-Za-z]?))))\s?[0-9][A-Za-z]{2})$/;

function isValidUKPostcode(postcode) {
  return postcodeRegex.test(postcode.trim());
}

const cleanWhitespace = (input: string): string => {
  return input.replace("\n", " ").replace(/ +/g, " ").trim();
};

const titleCaseRegex = /^([A-Z][a-zA-Z\(\)0-9\-\.']+)$/;

export function isTitleCase(str) {
  str = str
    .replace(" and ", " And ")
    .replace("off ", "Off ")
    .replace(" by ", " By ")
    .replace(" in ", " In ")
    .replace(" upon ", " Upon ")
    .replace(" at ", " At ")
    .replace(" on ", " On ")
    .replace(" le ", " Le ")
    .replace(" thames", " Thames")
    .replace(" de ", " De ")
    .replace(" of ", " Of ")
    .replace(" street", " Street")
    .replace(" the ", " The ");
  for (const word of str.split(" ")) {
    if (/^[0-9]/.test(word)) {
      // starts with a number
    } else if (/^[0-9\/\-&]+$/.test(word)) {
      // its a number
    } else if (titleCaseRegex.test(word)) {
      // is
    } else {
      return false;
    }
  }
  return true;
}

export const fieldRecogniser = (rawInput: string): RecogniserResult => {
  let input = cleanWhitespace(rawInput).replace(/,/g, " , ");
  const words = input.split(" ");
  let removedPostcode: string | null = null;

  if (words.length > 2) {
    const lastButOne = words[words.length - 2];
    const last = words[words.length - 1];
    if (isValidUKPostcode(`${lastButOne} ${last}`)) {
      removedPostcode = `${lastButOne} ${last}`;
      words[words.length - 2] = "";
      words[words.length - 1] = "";
      input = words.filter((testWord) => !!testWord).join(" ");
    }
  }

  const commaParts = input.split(",");

  let nonTitlecasePartCount = 0;
  if (commaParts.length > 0 && removedPostcode) {
    // could be an address
    const parts: string[] = [];
    for (const rawPart of commaParts) {
      const part = cleanWhitespace(rawPart);
      if (!part) {
        continue;
      }
      if (isValidUKPostcode(part) || isTitleCase(part)) {
        parts.push(part);
      } else {
        nonTitlecasePartCount++;
      }
    }

    if (nonTitlecasePartCount === 0) {
      return {
        type: "address",
        lines: parts,
        postcode: removedPostcode,
      };
    }
  }

  if (isTitleCase(input)) {
    return {
      type: "title",
      value: cleanWhitespace(input),
    };
  }

  return {
    type: "unknown",
  };
};

const removeThePrefix = (text: string): string => {
  if (text.toLocaleLowerCase().startsWith("the ")) {
    return text.substring(3).trim();
  }
  return text;
};

const matchBoth = (a: string, b: string, regex: RegExp): boolean => {
  return regex.test(a) && regex.test(b);
};

export const titlesMatch = (a: string, b: string): boolean => {
  if (a && b) {
    a = a
      .toLowerCase()
      .replace("guest house", "guesthouse")
      .replace(" & ", " and ")
      .replace(" and spa", "")
      .replace(/'s/g, "s")
      .toLowerCase();
    b = b
      .toLowerCase()
      .replace("guest house", "guesthouse")
      .replace(" & ", " and ")
      .replace(" and spa", "")
      .replace(/'s/g, "s")
      .toLowerCase();

    const match = removeThePrefix(a) === removeThePrefix(b);
    if (match) {
      return match;
    }

    if (!matchBoth(a, b, / hotel$/)) {
      a = a.replace(/ hotel$/, "");
      b = b.replace(/ hotel$/, "");
    }

    if (!matchBoth(a, b, / inn$/)) {
      a = a.replace(/ inn$/, "");
      b = b.replace(/ inn$/, "");
    }

    if (removeThePrefix(a) === removeThePrefix(b)) {
      return true;
    }

    // count words
    const aWords = a.split(" ");
    const bWords = b.split(" ");
    let matches = 0;
    let mismatches = 0;
    for (const aWord of aWords) {
      if (bWords.includes(aWord)) {
        matches++;
      } else {
        mismatches++;
      }
    }
    return matches > mismatches;
  }

  return false;
};
