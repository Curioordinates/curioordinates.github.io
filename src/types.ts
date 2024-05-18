export interface PlottableItem {
  latitude: number;
  longitude: number;
  title: string;
  surveyLink: string;
}

export type PlottableItemCallback = (item: PlottableItem) => void;
