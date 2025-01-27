import { ZodType, z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

export type LLMDataResult =
  | { ok: true; data: any[] }
  | { ok: false; error: string; message: string };

export interface LLMResult {
  message: string;
}

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
  prompt: string,
  targetProse: string
): Promise<LLMResult> {
  const data = {
    stream: false,
    model: "llama3.1:8b",
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

export async function callLLMStructured<ZodSchema extends ZodType>(
  prompt: string,
  targetProse: string,
  zodSchema: ZodSchema
): Promise<[Error, null] | [null, z.infer<ZodSchema>]> {
  const data = {
    stream: false,
    model: "llama3.1:8b",
    options: {
      num_ctx: 4096,
    },
    messages: [
      { role: "user", content: prompt },
      { role: "user", content: targetProse },
    ],
    format: zodToJsonSchema(zodSchema),
  };

  const fetchResult = await fetch("http://192.168.1.92:11434/api/chat", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!fetchResult.ok) {
    return [new Error(fetchResult.statusText), null];
  }
  const responseData = await fetchResult.json();
  return [null, zodSchema.parse(JSON.parse(responseData.message.content))];
}
