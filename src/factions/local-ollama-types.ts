import { z } from 'zod'

export const locationSchema = z.object({
    locationName: z.string(),
    locationType: z.string(),
});

export const locationListSchema = z.array(locationSchema);
