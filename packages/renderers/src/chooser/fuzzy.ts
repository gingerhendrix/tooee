import { rankBy } from "@tooee/fuzzy";
import type { ChooseItem } from "./types.js";

export interface FuzzyMatch {
  item: ChooseItem;
  originalIndex: number;
  score: number;
  positions: number[];
}

export const fuzzyFilter = function fuzzyFilter(items: ChooseItem[], query: string): FuzzyMatch[] {
  return rankBy(items, query, (item) => item.text);
};
