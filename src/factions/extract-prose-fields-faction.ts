import { FactionParams } from '../faction-types';

// take a specific input file and location for output files
export const runAction = async ({input,output}: FactionParams): Promise<void> => {
    const data = await input.readJson();

    const parts: string[] = [];

    if (data.title) {
        parts.push(data.title);
    }

    if (data.content) {
        parts.push(data.content);
    }

    await output.writeText({name: data.title, data: parts.join('\n')});
}
