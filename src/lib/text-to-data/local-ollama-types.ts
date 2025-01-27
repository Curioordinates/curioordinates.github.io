import { z } from "zod";

export const locationSchema = z.object({
  locationName: z.string(),
  locationType: z.string(),
});

export const twoSummaryLinesSchema = z.object({
  sentence1: z.string(),
  sentence2: z.string(),
});

export const locationListSchema = z.array(locationSchema);
