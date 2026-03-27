const WORD_BOUNDARY_CHARS = new Set([" ", "-", "_", ".", "/"])

/**
 * Fuzzy match a query against text, returning match positions and a score.
 *
 * Scoring:
 * - +3 for a match at the start of the string
 * - +2 for a match after a word boundary (space, hyphen, underscore, dot, slash)
 * - +1 for a consecutive match
 *
 * Returns null if the query doesn't match.
 */
export function fuzzyMatchPositions(
  query: string,
  text: string,
): { score: number; positions: number[] } | null {
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()
  const positions: number[] = []
  let score = 0
  let qi = 0

  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) {
      positions.push(ti)

      if (ti === 0) {
        score += 3
      } else if (WORD_BOUNDARY_CHARS.has(lowerText[ti - 1])) {
        score += 2
      } else if (positions.length > 1 && positions[positions.length - 2] === ti - 1) {
        score += 1
      }

      qi++
    }
  }

  if (qi < lowerQuery.length) return null
  return { score, positions }
}

/**
 * Fuzzy match a query against text, returning only the score.
 * Returns null if the query doesn't match.
 */
export function fuzzyMatch(query: string, text: string): number | null {
  const result = fuzzyMatchPositions(query, text)
  return result ? result.score : null
}
