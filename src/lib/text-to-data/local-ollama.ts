export type LLMDataResult =
    | { ok: true; data: any[] }
    | { ok: false; error: string; message: string };

export interface LLMResult {
    message: string;
}

export const geocodeLocation = async (
    model: 'llama3' | 'phi4:14b',
    targetProse: string
): Promise<LLMDataResult> => {
    const result = await callLLM(model,
        "For the following place name, give its location as accurately as possible (as a json object with decimal 'latitude' and 'longitude' fields and no preamble). If no location is known, simply answer with 'no-data-found'",
        targetProse
    );

    if (result.message.includes("no-data-found")) {
        // This is fine - just explicitly no data
        return {
            ok: true,
            data: [],
        };
    } else {

        let cleanMessage = result.message;
        if (cleanMessage.startsWith('```json')) {
            cleanMessage=cleanMessage.replace('```json','');
            
            const endIndex = cleanMessage.indexOf('```');
            if (endIndex != -1) {
                cleanMessage = cleanMessage.substring(0, endIndex).trim();
            }
        }

        if (cleanMessage.startsWith("{")) {
            try {
                return {
                    ok: true,
                    data: [JSON.parse(cleanMessage)],
                };
            } catch (e) {
                return {
                    ok: false,
                    error: `Failed to parse message`,
                    message: result.message,
                };
            }
        } else {
            return {
                ok: false,
                error: "Message does not look like json object",
                message: result.message,
            };
        }
    }
};

export const getMentionedLocations = async (
    targetProse: string
): Promise<LLMDataResult> => {
    const result = await callLLM(
        "From the following text, list all explictly mentioned geographic locations (as a json array of strings without preamble). If no locations are present, simply answer with 'no-data-found'",
        targetProse
    );

    if (result.message.includes("no-data-found")) {
        // This is fine - just explicitly no data
        return {
            ok: true,
            data: [],
        };
    } else {
        if (result.message.startsWith("[")) {
            try {
                return {
                    ok: true,
                    data: JSON.parse(result.message),
                };
            } catch (e) {
                return {
                    ok: false,
                    error: `Failed to parse message`,
                    message: result.message,
                };
            }
        } else {
            return {
                ok: false,
                error: "Message does not look like json array",
                message: result.message,
            };
        }
    }
};

export async function callLLM(
    model: 'llama3' | 'phi4:14b',
    prompt: string,
    targetProse: string
): Promise<LLMResult> {
    const data = {
        stream: false,
        model: model,
        options: {
            num_ctx: 4096,
        },
        messages: [
            { role: "user", content: prompt },
            { role: "user", content: targetProse },
        ],
    };

    const fetchResult = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        body: JSON.stringify(data),
    });

    const responseData = await fetchResult.json();
    const messageContent = responseData.message.content;

    return { message: messageContent };
}
