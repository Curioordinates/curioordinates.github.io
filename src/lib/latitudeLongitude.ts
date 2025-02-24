import { to5DP } from "./number-utils";
import { osGrid } from "./os-transform";
import OSPoint from "ospoint";

export const latitudeLongitudeFromOSGrid = (
  input: string
): { latitude: number; longitude: number } => {
  const eastingsNorthings = osGrid.fromGridRef(input);

  const point = new OSPoint(
    `${eastingsNorthings.no}`,
    `${eastingsNorthings.ea}`
  );

  const result = point.toWGS84();

  return {
    latitude: to5DP(result.latitude),
    longitude: to5DP(result.longitude),
  };
};
