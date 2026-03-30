import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("nested list rendering", () => {
  test("sub-items of unordered lists are visible", async () => {
    session = await launchView("nested-lists.md")
    const text = await session.text()
    expect(text).toContain("First item")
    expect(text).toContain("Sub-item A")
    expect(text).toContain("Sub-item B")
    expect(text).toContain("Sub-item C")
    expect(text).toContain("Second item")
    expect(text).toContain("Sub-item D")
    expect(text).toContain("Sub-item E")
    expect(text).toContain("Third item")
  }, 20000)

  test("ordered list with nested unordered sub-items", async () => {
    session = await launchView("nested-lists.md")
    // Scroll down to see the ordered nested section fully
    await session.type("j".repeat(4))
    await session.waitForText("Detail gamma", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Step one")
    expect(text).toContain("Detail alpha")
    expect(text).toContain("Detail beta")
    expect(text).toContain("Step two")
    expect(text).toContain("Detail gamma")
  }, 20000)

  test("deeply nested lists render all levels", async () => {
    session = await launchView("nested-lists.md")
    // Jump to bottom to ensure deep nesting section is visible
    await session.press(["shift", "g"])
    await session.waitForText("Level three item", { timeout: 10000 })
    const text = await session.text()
    expect(text).toContain("Level one")
    expect(text).toContain("Level two")
    expect(text).toContain("Level three item")
    expect(text).toContain("Back to level two")
  }, 20000)

  test("paragraph after nested lists is visible", async () => {
    session = await launchView("nested-lists.md")
    // Jump to end (G = shift+g)
    await session.press(["shift", "g"])
    await session.waitForText("Paragraph after nested lists", { timeout: 10000 })
    const text = await session.text()
    expect(text).toContain("Paragraph after nested lists.")
  }, 20000)
})
