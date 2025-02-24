import { z } from "zod";

export const locationSchema = z.object({
  locationName: z.string(),
  locationType: z.string(),
});

export const locationListSchema = z.array(locationSchema);

export const NamedThingListSchema = z.array(
  z.object({
    thingName: z.string(),
    thingType: z.string(),
  })
);

export const NarremeListSchema = z.array(
  z.object({
    theme: z.string(),
  })
);
