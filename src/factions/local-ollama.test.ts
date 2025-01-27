import * as fs from 'fs';
import * as path from 'path';
import { callLLM, callLLMStructured, getMentionedLocations } from './local-ollama';
import { locationListSchema } from './local-ollama-types';

describe('Local-Ollama', () => {

    jest.setTimeout(99999);
    
    it('should work', async () => {
        // given
        const fairyArticle = fs.readFileSync(path.join(__dirname, 'local-ollama-target.txt')).toString();    

        // when
        const result = await getMentionedLocations(fairyArticle);

        // then
        console.log(JSON.stringify(result, null, 3));
    });

        it("extracts structured location data", async () => {
            // given
            const   targetText  = fs
                .readFileSync(path.join(__dirname, "local-ollama-target.txt"))
                .toString();

            // when
            const [error, result] = await callLLMStructured(
                `List the locations mentioned in the following text. 
                The location should be returned as 'locationName'. Guessing the location type, e.g. (village, mountain, town, country) is ok.`,
                targetText,
                locationListSchema
            );

            // then
            console.log(JSON.stringify(result, null, 3));
        });

            it("should recognise password policy", async () => {
                // given
                const targetText = fs
                    .readFileSync(
                        path.join(__dirname, "local-ollama-password.txt")
                    )
                    .toString();

                // when
                const result = await callLLM('Considering ISO 27001, which ISO area does the following text address:',targetText);

                // then
                console.log(JSON.stringify(result, null, 3));
            });
});