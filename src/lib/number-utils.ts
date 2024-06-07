const FIVE_PLACES_REGEX = new RegExp("^-?\\d+(?:.\\d{0," + (5 || -1) + "})?");

function toFixed5(num: number): string {
  return num.toString().match(FIVE_PLACES_REGEX)![0];
}

/**
 * Truncates the number to 5 decimal places without rounding. Eg for a latitude/longitude simplifies the number to 1 meter accuracy at the equator.
 */
export const to5DP = (num: number) => parseFloat(toFixed5(num));
