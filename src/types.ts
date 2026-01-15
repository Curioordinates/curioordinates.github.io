export interface PlottableItem {
  latitude: number;
  longitude: number;
  title: string;
  surveyLink: string;
  link: string | null;
  details: string | null;
  tags: string | null;
}

export type PlottableItemCallback = (item: PlottableItem) => void;
