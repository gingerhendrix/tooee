import { fuzzyMatchPositions } from "@tooee/fuzzy";
import type { ChooseItem } from "./types.js";

export interface FuzzyMatch {
  item: ChooseItem;
  originalIndex: number;
  score: number;
  positions: number[];
}

export const fuzzyFilter = function fuzzyFilter(items: ChooseItem[], query: string): FuzzyMatch[] {
  if (!query) {
    return items.map((item, i) => ({ item, originalIndex: i, positions: [], score: 0 }));
  }

  const results: FuzzyMatch[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const match = fuzzyMatchPositions(query, item.text);
    if (match) {
      results.push({ item, originalIndex: i, positions: match.positions, score: match.score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
};
