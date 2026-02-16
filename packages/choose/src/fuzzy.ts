import type { ChooseItem } from "./types.js"

export interface FuzzyMatch {
  item: ChooseItem
  originalIndex: number
  score: number
  positions: number[]
}

const WORD_BOUNDARY_CHARS = new Set([" ", "-", "_", ".", "/"])

export function fuzzyFilter(items: ChooseItem[], query: string): FuzzyMatch[] {
  if (!query) {
    return items.map((item, i) => ({ item, originalIndex: i, score: 0, positions: [] }))
  }

  const lowerQuery = query.toLowerCase()
  const results: FuzzyMatch[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const text = item.text
    const lowerText = text.toLowerCase()
    const match = matchFuzzy(lowerText, lowerQuery)
    if (match) {
      results.push({ item, originalIndex: i, score: match.score, positions: match.positions })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results
}

function matchFuzzy(text: string, query: string): { score: number; positions: number[] } | null {
  const positions: number[] = []
  let score = 0
  let qi = 0

  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) {
      positions.push(ti)

      if (ti === 0) {
        score += 3
      } else if (WORD_BOUNDARY_CHARS.has(text[ti - 1])) {
        score += 2
      } else if (positions.length > 1 && positions[positions.length - 2] === ti - 1) {
        score += 1
      }

      qi++
    }
  }

  if (qi < query.length) return null
  return { score, positions }
}
