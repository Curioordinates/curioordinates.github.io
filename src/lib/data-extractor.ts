/**
 * given text represeting a single line of data:
 * assumes two sequential numbers (separated by space / comma / tab etc) - are latitude then longitude
 * otherwise looks for location (somehow)
 */

import { text } from "stream/consumers";
import { latitudeLongitudeFromOSGrid } from "./latitudeLongitude";

/**
 * Optionally signed integer or decimal number.
 */
const NUMBER_REGEX = /-?\d+(\.\d+)?/;
const LEADING_NUMBER_REGEX = /^-?\d+(\.\d+)?/;
const LEADING_SEPARATOR_REGEX = /^[ \t,;]/;
const TRAILING_SEPARATOR_REGEX = /[ \t,;]$/;
const LINK_REGEX = /https?:\/\/[^ \t]+/;
const IMAGE_URL_REGEX = /(\.jpg|\.png|\.jpeg)$/;
const POINT_FORMAT_REGEX = /Point\(-?\d+(\.\d+)? -?\d+(\.\d+)?\)/;

export interface ExtractedData {
  latitude?: number;
  longitude?: number;
  freeformAddress?: string;
  title?: string;
  link?: string;
  details?: string;
  imageLink?: string;
  remainingFragments: string[];
}

const removeLeadingSeparators = (text: string): string => {
  let workingText = text;
  while (LEADING_SEPARATOR_REGEX.test(workingText)) {
    workingText = workingText.substring(1);
  }
  return workingText;
};

const removeTrailingSeparators = (text: string): string => {
  let workingText = text;
  while (TRAILING_SEPARATOR_REGEX.test(workingText)) {
    workingText = workingText.substring(0, workingText.length - 1);
  }
  return workingText;
};

const setUrlByType = (data: ExtractedData, url: string): void => {
  if (url.match(IMAGE_URL_REGEX)) {
    data.imageLink = url;
  } else {
    data.link = url;
  }
};

/**
 * Handles Point(123.1234 -41.5454)
 */
const numbersFromPointFragment = (fragment: string): number[] => {
  const result: number[] = [];

  fragment.split(" ").forEach((part) => {
    const numberMatch = part.match(NUMBER_REGEX);
    if (numberMatch) {
      result.push(Number(numberMatch[0]));
    }
  });

  return result;
};

const cleanLink = (link: string): string => {
  return link.replace(/[,]+$/, "");
};

export const parseLine = ({ line }: { line: string }): ExtractedData => {
  let workingLine = line.trim();
  const remainingFragments: string[] = [];
  const result: ExtractedData = { remainingFragments };
  const numbers: number[] = [];
  const links: string[] = [];

  const nationalGridStart = workingLine.match(/[SNT][A-Z]\d{6}\t/);
  if (nationalGridStart) {
    const nationalGridRef = nationalGridStart[0].trim();
    workingLine = removeLeadingSeparators(
      workingLine.replace(nationalGridRef, "\t")
    );
    const nums = latitudeLongitudeFromOSGrid(nationalGridRef);
    numbers.push(nums.latitude, nums.longitude);
  }

  // try special 'point' format - should be done before basic number matching
  const pointMatch = workingLine.match(POINT_FORMAT_REGEX);
  if (pointMatch) {
    const pointFragment = pointMatch[0];
    workingLine = removeLeadingSeparators(
      workingLine.replace(pointFragment, "\t")
    );
    const pointNumbers = numbersFromPointFragment(pointFragment);
    numbers.push(pointNumbers[1], pointNumbers[0]);
  }

  while (true) {
    const linkMatch = workingLine.match(LINK_REGEX);
    if (linkMatch) {
      links.push(cleanLink(linkMatch[0]));
      workingLine = removeLeadingSeparators(
        workingLine.replace(linkMatch[0], "\t")
      );
    } else {
      break; // exit while loop
    }
  }

  for (const link of links) {
    setUrlByType(result, link);
  }

  // links can also contain numbers - so need to pull them first.

  // Loop while there's still something left on the line
  while (workingLine) {
    const matchArray = workingLine.match(LEADING_NUMBER_REGEX);
    if (numbers.length < 2 && matchArray) {
      const theNumber = matchArray[0];
      numbers.push(Number(theNumber));
      workingLine = workingLine.substring(theNumber.length);
      // We've removed the number, but we can also remove any separator.
      workingLine = removeLeadingSeparators(workingLine);
    } else {
      // the rest should only be 1 or 2 text sections (title / details)
      const textFragments = workingLine
        .split(/\t/g)
        .map(removeTrailingSeparators)
        .filter((fragment) => fragment !== "");

      const title = textFragments.shift();
      const details = textFragments.shift();
      if (title) {
        result.title = title.trim();
      }
      if (details) {
        result.details = details.trim();
      }

      if (numbers.length === 2) {
        result.latitude = numbers[0];
        result.longitude = numbers[1];
      }

      remainingFragments.push(...textFragments); // put any spair remaining fragments into remainingFragments.
      workingLine = ""; // end the loop
    }
  }

  return result;
};
