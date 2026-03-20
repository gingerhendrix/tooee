import type { Mark } from "./types.js"

export class MarkSet {
  readonly namespace: string
  readonly priority: number
  readonly #marks: readonly Mark[]

  constructor(namespace: string, priority: number, marks: Mark[]) {
    this.namespace = namespace
    this.priority = priority
    this.#marks = [...marks].sort(
      (a, b) => a.range.from.line - b.range.from.line,
    )
  }

  get size(): number {
    return this.#marks.length
  }

  marksAtLine(line: number): Mark[] {
    const results: Mark[] = []
    // Binary search for the first mark whose from.line >= line
    let lo = 0
    let hi = this.#marks.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (this.#marks[mid].range.from.line < line) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    for (let i = lo - 1; i >= 0; i--) {
      const mark = this.#marks[i]
      if (mark.range.to.line >= line) {
        results.push(mark)
      }
    }
    // Marks starting at this line
    for (let i = lo; i < this.#marks.length; i++) {
      const mark = this.#marks[i]
      if (mark.range.from.line > line) break
      // from.line === line
      results.push(mark)
    }
    return results
  }

  marksInRange(from: number, to: number): Mark[] {
    const results: Mark[] = []
    for (const mark of this.#marks) {
      // A mark overlaps [from, to] if mark.from.line <= to && mark.to.line >= from
      if (mark.range.from.line > to) break
      if (mark.range.to.line >= from) {
        results.push(mark)
      }
    }
    return results
  }

  [Symbol.iterator](): Iterator<Mark> {
    return this.#marks[Symbol.iterator]()
  }
}
