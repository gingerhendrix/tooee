import type { Mark, MarkStyle } from "./types.js"
import type { MarkSet } from "./mark-set.js"

export interface MarkState {
  readonly sets: readonly MarkSet[]
  readonly namespaces: readonly string[]
  marksAtLine(line: number): Mark[]
  effectiveStyleAtLine(line: number): MarkStyle | null
  getSet(namespace: string): MarkSet | undefined
}

function makeMarkState(sets: readonly MarkSet[]): MarkState {
  const sortedSets = [...sets].sort((a, b) => a.priority - b.priority)
  const namespaces = sortedSets.map((s) => s.namespace)

  return {
    sets: sortedSets,
    namespaces,

    marksAtLine(line: number): Mark[] {
      const results: Mark[] = []
      for (const set of sortedSets) {
        const marks = set.marksAtLine(line)
        for (const mark of marks) {
          results.push({
            ...mark,
            priority: mark.priority ?? set.priority,
          })
        }
      }
      results.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      return results
    },

    effectiveStyleAtLine(line: number): MarkStyle | null {
      const marks = this.marksAtLine(line)
      if (marks.length === 0) return null
      return marks[marks.length - 1].style
    },

    getSet(namespace: string): MarkSet | undefined {
      return sortedSets.find((s) => s.namespace === namespace)
    },
  }
}

export function createMarkState(sets: MarkSet[]): MarkState {
  return makeMarkState(sets)
}

export function updateMarkState(
  state: MarkState,
  namespace: string,
  newSet: MarkSet | null,
): MarkState {
  if (newSet && newSet.namespace !== namespace) {
    throw new Error(`Namespace mismatch: expected "${namespace}", got "${newSet.namespace}"`)
  }
  const filtered = state.sets.filter((s) => s.namespace !== namespace)
  if (newSet) {
    filtered.push(newSet)
  }
  return makeMarkState(filtered)
}
