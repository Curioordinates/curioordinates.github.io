import { FactionParams } from '../faction-types';
import { getMentionedLocations } from './local-ollama';

// take a specific input file and location for output files
export const locationFromProseWithLLM = async ({input,output}: FactionParams): Promise<void> => {
    const prose = await input.readText();


    output.addHistory({type:'prose', text:prose})

    const result = await getMentionedLocations(prose);

    if (result.ok) {
        await output.writeJson({ name: '', data: {locations: result.data}});
    } else {
        throw new Error(result.message);
    }

}
