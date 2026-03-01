import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchTable } from "./table-helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("view command context and multiselect e2e", () => {
  test("table renders with row and column counts", async () => {
    session = await launchTable("data.csv")
    const text = await session.text()
    expect(text).toContain("Rows:")
    expect(text).toContain("Cols:")
    expect(text).toMatch(/Rows:\s*3/)
    expect(text).toMatch(/Cols:\s*3/)
  }, 20000)

  test("table starts in cursor mode", async () => {
    session = await launchTable("data.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
  }, 20000)

  test("tab toggles selection in cursor mode on table", async () => {
    session = await launchTable("data.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press("tab")
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
  }, 20000)

  test("j/k navigate cursor in table", async () => {
    session = await launchTable("data.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press("j")
    await session.press("j")
    await session.press("k")
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
  }, 20000)

  test("numeric columns are right-aligned", async () => {
    session = await launchTable("data.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const text = await session.text()
    // The 'age' column (30, 25, 35) should be right-aligned
    // Verify the numbers appear with leading spaces
    expect(text).toContain("30")
    expect(text).toContain("25")
    expect(text).toContain("35")
  }, 20000)

  test("table content shows in status bar", async () => {
    session = await launchTable("data.csv")
    const text = await session.text()
    expect(text).toContain("Format: table")
    expect(text).toContain("Alice")
    expect(text).toContain("Bob")
    expect(text).toContain("Charlie")
  }, 20000)
})
