export interface PlottableItem {
  latitude: number;
  longitude: number;
  title: string;
  surveyLink: string;
  link: string | null;
}

export type PlottableItemCallback = (item: PlottableItem) => void;
