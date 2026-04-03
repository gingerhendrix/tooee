export function findMatchingLines(text: string, query: string): number[] {
  if (!query) return []
  const lowerQuery = query.toLowerCase()
  const results: number[] = []
  let lineStart = 0
  let lineNum = 0
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || text[i] === "\n") {
      const line = text.slice(lineStart, i).toLowerCase()
      if (line.includes(lowerQuery)) {
        results.push(lineNum)
      }
      lineStart = i + 1
      lineNum++
    }
  }
  return results
}
