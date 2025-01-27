import * as fs from "fs";
import * as path from "path";

export interface MDValue {
    text: string;
}

type ErrorTuple<Data> = [Error, null] | [null, Data];

type MDMap = { [key: string]: MDValue[] };

export const getFilesIn = async ({
    directory,
}: {
    directory: string;
}): Promise<ErrorTuple<string[]>> => {
    const files: string[] = [];

    for (const namedThing of fs.readdirSync(directory)) {
        const fullName = path.join(directory, namedThing);
        if (fs.existsSync(fullName)) {
            files.push(fullName);
        }
    }
    return [null, files];
};

const makeParseState = () => {
    const valueMap: { [key: string]: MDValue[] } = {};
    let currentValue: MDValue | null = null;

    const cursor = {
        isInValue: (): boolean => currentValue != null,
        getData: () => valueMap,
        add: (text: string): void => {
            if (currentValue) {
                currentValue.text += "\n" + text;
            }
        },
        endValue: () => (currentValue = null),
        startNew: (text: string): string | null => {
            // finish any current item.
            currentValue = null;

            // Should have colon 'end' the fieldname
            const colonIndex = text.indexOf(":");
            if (colonIndex === -1) {
                return "No colon";
            }
            const name = text.substring(0, colonIndex).trim();
            const value = text.substring(colonIndex + 1).trim();
            let valueList = valueMap[name];
            if (!valueList) {
                valueList = [];
                valueMap[name] = valueList;
            }
            currentValue = { text: value };
            valueList.push(currentValue);
            return null;
        },
    };
    return cursor;
};

export const readMDFile = (fileName: string): ErrorTuple<MDMap> => {
    console.log('reading: ' + fileName);
    const content = fs.readFileSync(fileName).toString();
    const parseState = makeParseState();

    for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        console.log('<<' + line);
        if (parseState.isInValue()) {
            if (rawLine.startsWith("  ") || rawLine.startsWith("\t")) {
                // part of the value (even if only whitespace)
                parseState.add(rawLine);
            } else if (line == "") {
                // ends the value
                parseState.endValue();
            } else {
                // end current thing and this is a new field.
                const error = parseState.startNew(rawLine);
                if (error) {
                    return [new Error(error), null];
                }
            }
        } else {
            // we are not in anything
            // so we expenct blank line or new value
            if (line == "") {
                // Nothing to do - we are not in a value
            } else {
                const error = parseState.startNew(rawLine);
                if (error) {
                    return [new Error(error), null];
                }
            }
        }
    }

    return [null, parseState.getData()];
};
