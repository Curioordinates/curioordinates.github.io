import { callLLMStructured } from "./local-ollama";
import { NamedThingListSchema, NarremeListSchema } from "./local-ollama-types";

export const namedEntityExtraction = async (
  text: string
): Promise<
  [Error, null] | [null, { thingName: string; thingType: string }[]]
> => {
  for (let i = 0; i < 5; i++) {
    const [error, result] = await callLLMStructured(
      `list every mentioned person, place and significant object in the supplied text.
        Preserve names like 'Jeoffry of London' and pay attention to capitalised words.
        The mentions should be returned as a list of json objects containing 'thingName' and the 'thingType' can be guessed e.g. village, mountain, person, town, country.
        The supplied text is as follows:`,
      text,
      NamedThingListSchema
    );

    if (error) {
      console.log(error);
    } else if (result.length > 0) {
      return [null, result];
    } else {
      console.log("No entity results");
    }
  }

  return [new Error("No extracted entities after 5 attempts"), null];
};

export const narremeExtraction = async (
  text: string
): Promise<[Error, null] | [null, { theme: string }[]]> => {
  for (let i = 0; i < 5; i++) {
    const [error, result] = await callLLMStructured(
      ``,
      `list the main themes in the supplied text, ordered in relevance to the narrative.
        Make each theme concise using 1,2 or 3 words maximum, for example: 'children found' 'procrastination' 'wolf killed'
          Return the result as json objects using the key 'theme'.
          The supplied text is as follows:
          ---
          ${text}`,

      NarremeListSchema
    );

    if (error) {
      console.log(error);
    } else if (result.length > 0) {
      return [null, result.filter((item) => item.theme !== "procrastination")];
    }
  }

  return [new Error("No extracted narremes after 5 attempts"), null];
};
