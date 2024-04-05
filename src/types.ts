export interface PlottableItem {
  latitude: number;
  longitude: number;
  title: string;
}

export type PlottableItemCallback = (item: PlottableItem) => void;
