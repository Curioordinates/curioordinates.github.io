import { link } from "fs"
import { splitLine } from "./splitting-line-parser";

export interface EntryFields {
    locationAsText: string | null,
    latitude: number | null,
    longitude: number | null,
    title:string
    link:string
    details: string | null,
    tags: string | null,
}   

// fields could be comma separated - or tab or ` or nothing (whitespace only)
export const parseEntryFields = (rawLine: string): [Error, null] | [null, EntryFields] => {

  const [error, parts] = splitLine(rawLine);
  if (error) {
    return [error, null];
  }

  let label:string | null = null;
  let description:string | null = null;
  if (parts.textFragments.length == 0) {
    return [new Error("No text fragments found"), null];
  } else if (parts.textFragments.length > 2) {
    console.log(JSON.stringify(parts.textFragments,null,3));

    return [new Error("Too many text fragments found"), null];
  } else {
    label = parts.textFragments[0];
    description = parts.textFragments[1] ?? null // may not be presesent
  }
  
  if (parts.links.length > 1) {
    return [new Error("Too many links found"), null];
  }

  let link:string | null = parts.links[0] ?? null;

   const result: EntryFields = {
    locationAsText: parts.locationAsText ?? null,
    latitude: parts.latitude ?? null,
    longitude: parts.longitude ?? null,
    title: label! ,
    link: link! ,
    details: description,
    tags: parts.tags ?? null,
   }
  
   return [null, result];
};
