import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { TooeeProvider, useNavigation } from "@tooee/shell"
import { findMatchingLines, useSearch, type SearchState } from "@tooee/search"
import { useMode } from "@tooee/commands"
import { press, pressEscape, type TestSession } from "./support/test-helpers.ts"

describe("findMatchingLines", () => {
  test("empty query returns empty array", () => {
    expect(findMatchingLines("hello\nworld", "")).toEqual([])
  })

  test("single match", () => {
    expect(findMatchingLines("foo\nbar\nbaz", "bar")).toEqual([1])
  })

  test("multiple matches", () => {
    expect(findMatchingLines("foo\nbar\nfoo\nbaz", "foo")).toEqual([0, 2])
  })

  test("case insensitive", () => {
    expect(findMatchingLines("Hello\nWORLD\nhello", "hello")).toEqual([0, 2])
  })

  test("no matches", () => {
    expect(findMatchingLines("foo\nbar\nbaz", "xyz")).toEqual([])
  })

  test("partial line match", () => {
    expect(findMatchingLines("foobar\nbaz", "oob")).toEqual([0])
  })

  test("single line text", () => {
    expect(findMatchingLines("hello world", "world")).toEqual([0])
  })

  test("empty text", () => {
    expect(findMatchingLines("", "foo")).toEqual([])
  })
})

const TEST_TEXT = "alpha\nbeta\ngamma\nalpha again\ndelta"

// Module-level ref for imperative access to search state from tests
let _searchHandle: SearchState | null = null

function SearchHarness() {
  const nav = useNavigation({ rowCount: TEST_TEXT.split("\n").length, viewportHeight: 3 })
  const mode = useMode()
  const search = useSearch({
    match: (query) => findMatchingLines(TEST_TEXT, query),
    onJump: nav.setCursor,
  })

  // Expose search state to test code via module-level ref
  _searchHandle = search

  return (
    <box flexDirection="column">
      <text content={`mode:${mode}`} />
      <text content={`cursor:${nav.cursor !== null ? nav.cursor : "null"}`} />
      <text content={`search:${search.searchActive}`} />
      <text content={`matches:${search.matchingLines.join(",")}`} />
      <text content={`matchIdx:${search.currentMatchIndex}`} />
      <text content={`query:${search.searchQuery}`} />
    </box>
  )
}

async function setup() {
  const session = await testRender(
    <TooeeProvider>
      <SearchHarness />
    </TooeeProvider>,
    { width: 60, height: 24, kittyKeyboard: true },
  )
  await session.renderOnce()
  return session
}

let testSetup: TestSession

afterEach(() => {
  testSetup?.renderer.destroy()
  _searchHandle = null
})

describe("search hook", () => {
  test("/ activates search and switches to insert mode", async () => {
    testSetup = await setup()
    await press(testSetup, "/")
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("search:true")
    expect(frame).toContain("mode:insert")
  })

  test("search live-updates matches while typing", async () => {
    testSetup = await setup()
    await press(testSetup, "/")

    await act(async () => {
      _searchHandle!.setSearchQuery("alpha")
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("search:true")
    expect(frame).toContain("query:alpha")
    expect(frame).toContain("matches:0,3")
  })

  test("Escape cancels search and restores cursor mode", async () => {
    testSetup = await setup()
    await press(testSetup, "/")

    await act(async () => {
      _searchHandle!.setSearchQuery("alpha")
    })
    await testSetup.renderOnce()

    await pressEscape(testSetup)
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("search:false")
    expect(frame).toContain("mode:cursor")
    expect(frame).toContain("matches:")
  })

  test("n and N cycle matches after submit", async () => {
    testSetup = await setup()
    await press(testSetup, "/")

    await act(async () => {
      _searchHandle!.setSearchQuery("alpha")
    })
    await testSetup.renderOnce()

    // Submit search
    await act(async () => {
      _searchHandle!.submitSearch()
    })
    await testSetup.renderOnce()

    let frame = testSetup.captureCharFrame()
    expect(frame).toContain("search:false")
    expect(frame).toContain("mode:cursor")
    expect(frame).toContain("matches:0,3")
    expect(frame).toContain("matchIdx:0")
    expect(frame).toContain("cursor:0")

    await press(testSetup, "n")
    frame = testSetup.captureCharFrame()
    expect(frame).toContain("matchIdx:1")
    expect(frame).toContain("cursor:3")

    await press(testSetup, "n", { shift: true })
    frame = testSetup.captureCharFrame()
    expect(frame).toContain("matchIdx:0")
    expect(frame).toContain("cursor:0")
  })

  test("submitSearch exits insert mode but keeps matches", async () => {
    testSetup = await setup()
    await press(testSetup, "/")

    await act(async () => {
      _searchHandle!.setSearchQuery("alpha")
    })
    await testSetup.renderOnce()

    await act(async () => {
      _searchHandle!.submitSearch()
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("mode:cursor")
    expect(frame).toContain("search:false")
    expect(frame).toContain("matches:0,3")
  })
})
