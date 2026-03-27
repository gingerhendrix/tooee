import { fuzzyMatchPositions } from "@tooee/fuzzy"
import type { ChooseItem } from "./types.js"

export interface FuzzyMatch {
  item: ChooseItem
  originalIndex: number
  score: number
  positions: number[]
}

export function fuzzyFilter(items: ChooseItem[], query: string): FuzzyMatch[] {
  if (!query) {
    return items.map((item, i) => ({ item, originalIndex: i, score: 0, positions: [] }))
  }

  const results: FuzzyMatch[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const match = fuzzyMatchPositions(query, item.text)
    if (match) {
      results.push({ item, originalIndex: i, score: match.score, positions: match.positions })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results
}
