import { openstreetmapLookup } from "./api";
import { attemptGetCacheFile, writeCacheFile } from "./caching";
import { geocodeLocation } from "./local-ollama";

 

export interface SpherifyResult {

}

export type LLMLocationSuccess = {ok:true, latitude:number, longitude:number} ;
export type LLMLocationFailure = {ok:false, llmData?: any, message:string, error:string}; 

const queryPlaceViaLLM = async (model: 'llama3' | 'phi4:14b', placeName: string, stepLog?: string[]): Promise<LLMLocationSuccess | LLMLocationFailure> => {
    const relativeCacheFileName = ['queryPlaceViaLLM', model, placeName.toLowerCase()].join('/');
    console.log('Relative cache file name: ' + relativeCacheFileName);
    const cacheText = attemptGetCacheFile(relativeCacheFileName);


    if (cacheText) {
        console.error('Cache for llm:' + cacheText );
        if (stepLog) {
            stepLog.push('Cache file was present - ' + relativeCacheFileName);
        }
        return JSON.parse(cacheText);
    }

    const llmResponse = await geocodeLocation(model,placeName);

    console.error('LLM REsponse: ' + JSON.stringify(llmResponse));

    let cleanedAnswer: (LLMLocationFailure | LLMLocationSuccess);
    if (llmResponse.ok && llmResponse.data.length) {
        const answer : LLMLocationSuccess = {
            ok: true,
            latitude : llmResponse.data[0].latitude,
            longitude : llmResponse.data[0].longitude,
        }
        cleanedAnswer = answer;
    } else {
        const answer : LLMLocationFailure = {   
            ok:false,
            llmData : llmResponse['data'],
            error : llmResponse['error'],
            message: llmResponse['message'],
        };
        cleanedAnswer  = answer;
    }

    writeCacheFile(relativeCacheFileName, JSON.stringify(cleanedAnswer));
    if (stepLog) {
        stepLog.push('Cache file created - ' + relativeCacheFileName);
    }

    return cleanedAnswer;
}

const spherify = async (text:string) : Promise<SpherifyResult> => {
    console.error(`Spherify called with [${text}]`);

    const result = await openstreetmapLookup(text);
    const llama3Result  = await queryPlaceViaLLM('llama3', text); 
    const phi4Result = await queryPlaceViaLLM('phi4:14b', text); 
//    console.log(JSON.stringify(result));

    result['_source'] = 'openstreetmap';
    llama3Result["_source"] = "local-llm-llama3";
    phi4Result["_source"] = 'local-llm-phi4';
    
    return {
        evidence: [result, llama3Result, phi4Result],
    };
};

const go = async () => {
    // Get params from CLI
    const args = process.argv.slice(2); // Ignore the first two entries (node path and script path)
    const inputText = args.join(' ');

    // Call the main API
    const result = await spherify(inputText);
    console.log(JSON.stringify(result, null, 3));
}

go();
