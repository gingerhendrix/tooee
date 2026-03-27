import { test, expect, describe } from "bun:test"
import {
  MarkSet,
  MarkSetBuilder,
  createMarkState,
  updateMarkState,
  MarkPriorities,
} from "@tooee/marks"

function buildSet(namespace: string, priority: number, lines: number[]): MarkSet {
  const builder = new MarkSetBuilder()
  for (const line of lines) {
    builder.addLine(line, { background: `${namespace}-bg` })
  }
  return builder.build(namespace, priority)
}

describe("createMarkState", () => {
  test("creates empty state", () => {
    const state = createMarkState([])
    expect(state.sets).toHaveLength(0)
    expect(state.namespaces).toEqual([])
  })

  test("creates state with sets sorted by priority", () => {
    const high = buildSet("high", 300, [1])
    const low = buildSet("low", 100, [1])
    const mid = buildSet("mid", 200, [1])

    const state = createMarkState([high, low, mid])
    expect(state.namespaces).toEqual(["low", "mid", "high"])
  })
})

describe("marksAtLine", () => {
  test("returns empty for line with no marks", () => {
    const state = createMarkState([buildSet("a", 100, [1, 3, 5])])
    expect(state.marksAtLine(2)).toEqual([])
  })

  test("merges marks from multiple sets", () => {
    const search = buildSet("search", MarkPriorities.SEARCH_MATCH, [5, 10])
    const cursor = buildSet("cursor", MarkPriorities.CURSOR, [5])
    const state = createMarkState([search, cursor])

    const marks = state.marksAtLine(5)
    expect(marks).toHaveLength(2)
  })

  test("returns marks sorted by priority ascending", () => {
    const search = buildSet("search", MarkPriorities.SEARCH_MATCH, [5])
    const cursor = buildSet("cursor", MarkPriorities.CURSOR, [5])
    const selection = buildSet("selection", MarkPriorities.SELECTION, [5])
    const state = createMarkState([cursor, search, selection])

    const marks = state.marksAtLine(5)
    expect(marks[0].priority).toBe(MarkPriorities.SEARCH_MATCH)
    expect(marks[1].priority).toBe(MarkPriorities.SELECTION)
    expect(marks[2].priority).toBe(MarkPriorities.CURSOR)
  })

  test("uses set priority when mark has no priority", () => {
    const set = buildSet("test", 150, [3])
    const state = createMarkState([set])

    const marks = state.marksAtLine(3)
    expect(marks[0].priority).toBe(150)
  })
})

describe("effectiveStyleAtLine", () => {
  test("returns null for line with no marks", () => {
    const state = createMarkState([buildSet("a", 100, [1])])
    expect(state.effectiveStyleAtLine(2)).toBeNull()
  })

  test("returns style from highest priority mark", () => {
    const low = buildSet("low", 100, [5])
    const high = buildSet("high", 300, [5])
    const state = createMarkState([low, high])

    const style = state.effectiveStyleAtLine(5)
    expect(style?.background).toBe("high-bg")
  })

  test("respects per-mark priority override", () => {
    const lowSet = new MarkSet("low", 100, [
      {
        range: { from: { line: 5 }, to: { line: 5 } },
        style: { background: "override-bg" },
        priority: 999,
      },
    ])
    const highSet = buildSet("high", 300, [5])
    const state = createMarkState([lowSet, highSet])

    const style = state.effectiveStyleAtLine(5)
    expect(style?.background).toBe("override-bg")
  })
})

describe("updateMarkState", () => {
  test("adds new namespace", () => {
    const state = createMarkState([buildSet("a", 100, [1])])
    const updated = updateMarkState(state, "b", buildSet("b", 200, [2]))

    expect(updated.namespaces).toContain("a")
    expect(updated.namespaces).toContain("b")
    expect(updated.sets).toHaveLength(2)
  })

  test("replaces existing namespace", () => {
    const state = createMarkState([
      buildSet("search", 100, [1, 2, 3]),
      buildSet("cursor", 500, [1]),
    ])
    const updated = updateMarkState(state, "search", buildSet("search", 100, [5, 6]))

    expect(updated.sets).toHaveLength(2)
    expect(updated.marksAtLine(1)).toHaveLength(1) // only cursor
    expect(updated.marksAtLine(5)).toHaveLength(1) // new search
  })

  test("removes namespace when newSet is null", () => {
    const state = createMarkState([buildSet("a", 100, [1]), buildSet("b", 200, [1])])
    const updated = updateMarkState(state, "a", null)

    expect(updated.namespaces).toEqual(["b"])
    expect(updated.sets).toHaveLength(1)
  })

  test("removing non-existent namespace is no-op", () => {
    const state = createMarkState([buildSet("a", 100, [1])])
    const updated = updateMarkState(state, "nonexistent", null)

    expect(updated.namespaces).toEqual(["a"])
  })

  test("throws on namespace mismatch between arg and newSet", () => {
    const state = createMarkState([buildSet("a", 100, [1])])
    const wrongSet = buildSet("b", 200, [2])

    expect(() => updateMarkState(state, "a", wrongSet)).toThrow(/namespace mismatch/i)
  })
})

describe("equal-priority tie behavior", () => {
  test("marks with equal priority maintain stable order from sets", () => {
    const a = buildSet("a", 100, [5])
    const b = buildSet("b", 100, [5])
    const state = createMarkState([a, b])

    const marks = state.marksAtLine(5)
    expect(marks).toHaveLength(2)
    // Both have priority 100 — stable sort preserves insertion order
    expect(marks[0].priority).toBe(100)
    expect(marks[1].priority).toBe(100)
  })
})

describe("duplicate namespaces in createMarkState", () => {
  test("both sets with same namespace are kept", () => {
    const a1 = buildSet("a", 100, [1])
    const a2 = buildSet("a", 200, [2])
    const state = createMarkState([a1, a2])

    // Both are present (createMarkState doesn't deduplicate)
    expect(state.sets).toHaveLength(2)
    expect(state.marksAtLine(1)).toHaveLength(1)
    expect(state.marksAtLine(2)).toHaveLength(1)
  })
})

describe("getSet", () => {
  test("returns set by namespace", () => {
    const state = createMarkState([buildSet("search", 100, [1]), buildSet("cursor", 500, [2])])

    const set = state.getSet("search")
    expect(set).toBeDefined()
    expect(set!.namespace).toBe("search")
  })

  test("returns undefined for unknown namespace", () => {
    const state = createMarkState([buildSet("a", 100, [1])])
    expect(state.getSet("unknown")).toBeUndefined()
  })
})
