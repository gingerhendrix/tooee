import type { Mark, MarkPosition, MarkStyle } from "./types.js"
import { MarkSet } from "./mark-set.js"

export class MarkSetBuilder {
  readonly #marks: Mark[] = []

  addLine(line: number, style: MarkStyle, data?: unknown): this {
    this.#marks.push({
      range: { from: { line }, to: { line } },
      style,
      data,
    })
    return this
  }

  addRange(from: MarkPosition, to: MarkPosition, style: MarkStyle, data?: unknown): this {
    this.#marks.push({
      range: { from, to },
      style,
      data,
    })
    return this
  }

  addMark(mark: Mark): this {
    this.#marks.push(mark)
    return this
  }

  build(namespace: string, priority: number): MarkSet {
    return new MarkSet(namespace, priority, this.#marks)
  }
}
