import { describe, test, expect } from "bun:test"
import { MarkSetBuilder, createMarkState, MarkPriorities } from "@tooee/marks"
import { marksToDecorations } from "../src/marks-bridge.js"

describe("marksToDecorations — generic mark backgrounds", () => {
  test("extracts background from non-built-in namespace", () => {
    const builder = new MarkSetBuilder()
    builder.addLine(3, { background: "#ff0000" })
    builder.addLine(7, { background: "#00ff00" })
    const set = builder.build("diagnostic", MarkPriorities.DIAGNOSTIC)

    const deco = marksToDecorations(createMarkState([set]))
    expect(deco.markBackgrounds).toBeDefined()
    expect(deco.markBackgrounds!.get(3)).toBe("#ff0000")
    expect(deco.markBackgrounds!.get(7)).toBe("#00ff00")
    expect(deco.markBackgrounds!.size).toBe(2)
  })

  test("extracts gutterBackground from non-built-in namespace", () => {
    const builder = new MarkSetBuilder()
    builder.addLine(5, { gutterBackground: "#aabbcc" })
    const set = builder.build("lint", 150)

    const deco = marksToDecorations(createMarkState([set]))
    expect(deco.markGutterBackgrounds).toBeDefined()
    expect(deco.markGutterBackgrounds!.get(5)).toBe("#aabbcc")
  })

  test("does NOT include built-in namespaces in markBackgrounds", () => {
    const builtins = ["cursor", "selection", "search", "currentMatch", "toggled"] as const
    const sets = builtins.map((ns, i) => {
      const builder = new MarkSetBuilder()
      builder.addLine(i, { background: `#${String(i).padStart(6, "0")}` })
      return builder.build(ns, (i + 1) * 100)
    })

    const deco = marksToDecorations(createMarkState(sets))
    expect(deco.markBackgrounds).toBeUndefined()
    expect(deco.markGutterBackgrounds).toBeUndefined()
  })

  test("higher priority mark background overrides lower priority", () => {
    const low = new MarkSetBuilder()
    low.addLine(10, { background: "#111111" })
    const lowSet = low.build("lowPri", 100)

    const high = new MarkSetBuilder()
    high.addLine(10, { background: "#999999" })
    const highSet = high.build("highPri", 300)

    // createMarkState sorts by ascending priority, so highPri overrides lowPri
    const deco = marksToDecorations(createMarkState([highSet, lowSet]))
    expect(deco.markBackgrounds!.get(10)).toBe("#999999")
  })

  test("expands range marks across all lines", () => {
    const builder = new MarkSetBuilder()
    builder.addRange({ line: 2 }, { line: 5 }, { background: "#abcdef" })
    const set = builder.build("highlight", 200)

    const deco = marksToDecorations(createMarkState([set]))
    expect(deco.markBackgrounds!.size).toBe(4)
    for (let line = 2; line <= 5; line++) {
      expect(deco.markBackgrounds!.get(line)).toBe("#abcdef")
    }
  })

  test("returns undefined when no non-built-in marks have backgrounds", () => {
    const builder = new MarkSetBuilder()
    builder.addLine(1, { signBefore: ">" })
    const set = builder.build("custom", 200)

    const deco = marksToDecorations(createMarkState([set]))
    expect(deco.markBackgrounds).toBeUndefined()
    expect(deco.markGutterBackgrounds).toBeUndefined()
  })

  test("signs from all namespaces still work", () => {
    // Built-in namespace with sign
    const searchBuilder = new MarkSetBuilder()
    searchBuilder.addLine(1, { signBefore: "S", foreground: "#ff0000" })
    const searchSet = searchBuilder.build("search", MarkPriorities.SEARCH_MATCH)

    // Custom namespace with sign
    const customBuilder = new MarkSetBuilder()
    customBuilder.addLine(2, { signBefore: "!", foreground: "#00ff00" })
    const customSet = customBuilder.build("diagnostic", MarkPriorities.DIAGNOSTIC)

    const deco = marksToDecorations(createMarkState([searchSet, customSet]))
    expect(deco.signs).toBeDefined()
    expect(deco.signs!.get(1)).toEqual({ text: "S", fg: "#ff0000" })
    expect(deco.signs!.get(2)).toEqual({ text: "!", fg: "#00ff00" })
  })

  test("mixed backgrounds and gutter backgrounds from same mark", () => {
    const builder = new MarkSetBuilder()
    builder.addLine(4, { background: "#112233", gutterBackground: "#445566" })
    const set = builder.build("annotation", 250)

    const deco = marksToDecorations(createMarkState([set]))
    expect(deco.markBackgrounds!.get(4)).toBe("#112233")
    expect(deco.markGutterBackgrounds!.get(4)).toBe("#445566")
  })
})
