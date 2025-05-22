// splits html source into text and tags!
export type TTItem =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "tag";
      value: string;
    };

function removeComments(source: string): string {
  let workingText = source;

  while (true) {
    const commentStart = workingText.indexOf("<!--");
    if (commentStart != -1) {
      const commentEnd = workingText.indexOf("-->");
      if (commentEnd != -1) {
        workingText =
          workingText.substring(0, commentStart) +
          workingText.substring(commentEnd + 3);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return workingText;
}

export const toTextAndTags = (
  rawInput: string
): [Error, null] | [null, TTItem[]] => {
  const input = removeComments(rawInput);

  let currentTextTag: TTItem | null = null;
  const result: TTItem[] = [];
  let index = 0;

  while (index < input.length) {
    //assume a previous tag has ended
    const char = input[index];
    if (char === "<") {
      currentTextTag = null;
      const endIndex = input.indexOf(">", index);

      if (endIndex === -1) {
        // bit odd - we're done
        return [new Error("Unexpected open tag"), null];
      }
      const content = input.substring(index, endIndex + 1);
      result.push({
        type: "tag",
        value: content,
      });
      index = endIndex + 1;
    } else {
      // its text
      if (!currentTextTag) {
        currentTextTag = {
          type: "text",
          value: "",
        };
        result.push(currentTextTag);
      }
      currentTextTag.value += char;
      index++;
    }
  }

  return [null, result];
};
