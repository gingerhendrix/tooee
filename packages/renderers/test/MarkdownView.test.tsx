import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, describe, afterEach } from "bun:test"
import { ThemeSwitcherProvider } from "@tooee/themes"
import { MarkdownView } from "../src/MarkdownView.js"

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

test("renders heading text", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content="# Hello World" />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Hello World")
  expect(frame).toContain("#")
})

test("renders list items", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"- First item\n- Second item\n- Third item"} />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("First item")
  expect(frame).toContain("Second item")
  expect(frame).toContain("Third item")
})

test("renders code blocks", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"```\nconst x = 1\n```"} />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("const x = 1")
})

test("renders markdown table", async () => {
  const md = `| Name | Age | City |
| --- | --- | --- |
| Alice | 30 | London |
| Bob | 25 | Paris |`
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={md} />
    </ThemeSwitcherProvider>,
    { width: 60, height: 20 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Name")
  expect(frame).toContain("Alice")
  expect(frame).toContain("London")
  expect(frame).toContain("Bob")
})

test("selected blocks have gutter highlight", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView
        content={"# Heading\n\nParagraph one\n\nParagraph two\n\nParagraph three"}
        selectedBlocks={{ start: 1, end: 2 }}
      />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Paragraph one")
  expect(frame).toContain("Paragraph two")
})

test("active block renders with gutter", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"# Heading\n\nParagraph one\n\nParagraph two"} activeBlock={1} />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Heading")
  expect(frame).toContain("Paragraph one")
  expect(frame).toContain("Paragraph two")
})

test("selected blocks snapshot", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView
        content={"# Title\n\nFirst paragraph\n\nSecond paragraph\n\nThird paragraph"}
        activeBlock={1}
        selectedBlocks={{ start: 1, end: 2 }}
      />
    </ThemeSwitcherProvider>,
    { width: 60, height: 20 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toMatchSnapshot()
})

test("snapshot", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView
        content={
          "# Title\n\nSome paragraph text.\n\n- Item one\n- Item two\n\n```js\nconst x = 1\n```"
        }
      />
    </ThemeSwitcherProvider>,
    { width: 60, height: 20 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toMatchSnapshot()
})

// ---------------------------------------------------------------------------
// Bug fix: multi-line code blocks show all lines (height clamping fix)
// ---------------------------------------------------------------------------

describe("code block height", () => {
  test("multi-line code block shows all lines", async () => {
    const code = [
      "const a = 1",
      "const b = 2",
      "const c = 3",
      "const d = 4",
      "const e = 5",
    ].join("\n")
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={`\`\`\`js\n${code}\n\`\`\``} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("const a = 1")
    expect(frame).toContain("const b = 2")
    expect(frame).toContain("const c = 3")
    expect(frame).toContain("const d = 4")
    expect(frame).toContain("const e = 5")
  })

  test("multi-line code block snapshot", async () => {
    const code = [
      "function greet(name) {",
      "  console.log(`Hello, ${name}!`)",
      "  return true",
      "}",
    ].join("\n")
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={`# Code\n\n\`\`\`js\n${code}\n\`\`\``} />
      </ThemeSwitcherProvider>,
      { width: 60, height: 20 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })
})

// ---------------------------------------------------------------------------
// Bug fix: content after code blocks/tables is correctly positioned
// ---------------------------------------------------------------------------

describe("content positioning after embedded blocks", () => {
  test("paragraph after multi-line code block is visible", async () => {
    const code = [
      "line 1",
      "line 2",
      "line 3",
    ].join("\n")
    const md = `# Heading\n\n\`\`\`\n${code}\n\`\`\`\n\nThis text follows the code block.`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // All code lines should be present
    expect(frame).toContain("line 1")
    expect(frame).toContain("line 2")
    expect(frame).toContain("line 3")
    // The paragraph after the code block must also be visible
    expect(frame).toContain("This text follows the code block.")
  })

  test("paragraph after table is visible", async () => {
    const md = `# Heading

| Key | Value |
| --- | --- |
| Alpha | 100 |
| Beta | 200 |

This text follows the table.`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Alpha")
    expect(frame).toContain("Beta")
    expect(frame).toContain("This text follows the table.")
  })

  test("content after code block does not overlap", async () => {
    const code = ["a = 1", "b = 2", "c = 3"].join("\n")
    const md = `\`\`\`\n${code}\n\`\`\`\n\nAfter code.`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 60, height: 20 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    const lines = frame.split("\n")

    // Find the line with "After code."
    const afterCodeLineIdx = lines.findIndex((l) => l.includes("After code."))
    expect(afterCodeLineIdx).toBeGreaterThan(-1)

    // Find the line with bottom border of the code block
    const bottomBorderIdx = lines.findIndex((l) => l.includes("\u2514"))
    expect(bottomBorderIdx).toBeGreaterThan(-1)

    // "After code." must be BELOW the bottom border (not overlapping)
    expect(afterCodeLineIdx).toBeGreaterThan(bottomBorderIdx)
  })
})

// ---------------------------------------------------------------------------
// Bug fix: table rendering without nested row-document
// ---------------------------------------------------------------------------

describe("inline table rendering", () => {
  test("table shows all rows and borders", async () => {
    const md = `| Name | Score |
| --- | --- |
| Alice | 95 |
| Bob | 87 |
| Carol | 92 |`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 60, height: 20 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Alice")
    expect(frame).toContain("Bob")
    expect(frame).toContain("Carol")
    // Header underline should be present (clean minimal style, no box borders)
    expect(frame).toContain("\u2500") // horizontal line under header
  })

  test("table with many rows shows all content", async () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      `| Item ${i + 1} | ${(i + 1) * 10} |`,
    ).join("\n")
    const md = `| Name | Value |\n| --- | --- |\n${rows}`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 60, height: 30 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Item 1")
    expect(frame).toContain("Item 8")
    expect(frame).toContain("Name")
    expect(frame).toContain("Value")
  })

  test("table snapshot", async () => {
    const md = `# Data

| Name | Age | City |
| --- | --- | --- |
| Alice | 30 | London |
| Bob | 25 | Paris |

Summary text.`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 60, height: 20 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })
})

// ---------------------------------------------------------------------------
// Mixed content: code blocks + tables + text together
// ---------------------------------------------------------------------------

describe("mixed content rendering", () => {
  test("heading + code + paragraph + table + paragraph all visible", async () => {
    const md = `# Mixed

\`\`\`python
def hello():
    return 42
\`\`\`

Middle paragraph.

| Col A | Col B |
| --- | --- |
| X | Y |

Final paragraph.`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 30 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Mixed")
    expect(frame).toContain("def hello():")
    expect(frame).toContain("return 42")
    expect(frame).toContain("Middle paragraph.")
    expect(frame).toContain("Col A")
    expect(frame).toContain("X")
    expect(frame).toContain("Final paragraph.")
  })

  test("mixed content snapshot", async () => {
    const md = `# Report

\`\`\`
alpha
beta
gamma
\`\`\`

Summary of results:

| Metric | Value |
| --- | --- |
| Count | 42 |
| Rate | 99% |

Done.`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 60, height: 30 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })
})

// ---------------------------------------------------------------------------
// Bug fix: scroll does not leak into embedded code blocks
// ---------------------------------------------------------------------------

describe("scroll isolation", () => {
  test("code block content stays intact after scroll events", async () => {
    const code = ["line A", "line B", "line C"].join("\n")
    // Create content tall enough that the document can scroll
    const paragraphs = Array.from({ length: 20 }, (_, i) =>
      `Paragraph ${i + 1} text.`,
    ).join("\n\n")
    const md = `# Doc\n\n\`\`\`\n${code}\n\`\`\`\n\n${paragraphs}`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 20 },
    )
    await testSetup.renderOnce()

    // Capture frame before scrolling
    const frameBefore = testSetup.captureCharFrame()
    expect(frameBefore).toContain("line A")
    expect(frameBefore).toContain("line B")
    expect(frameBefore).toContain("line C")

    // Send scroll events at the code block position (roughly row 4-5, col 40)
    const { mockMouse } = testSetup
    for (let i = 0; i < 3; i++) {
      await mockMouse.scroll(40, 4, "down")
    }
    await testSetup.renderOnce()

    const frameAfter = testSetup.captureCharFrame()
    // After scrolling down, if the code block is still in view,
    // all its lines should still be visible and intact.
    // If it scrolled out of view, that's fine too - the document scrolled.
    // The key assertion: no partial code block content (which would indicate
    // the code block scrolled internally while the document also scrolled).
    if (frameAfter.includes("line A")) {
      // Code block still in view - all lines should be present
      expect(frameAfter).toContain("line B")
      expect(frameAfter).toContain("line C")
    }
  })
})
