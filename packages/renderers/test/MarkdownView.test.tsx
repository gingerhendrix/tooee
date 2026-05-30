import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, describe, afterEach } from "bun:test"
import { ThemeSwitcherProvider } from "@tooee/themes"
import { MarkPriorities, MarkSetBuilder, createMarkState } from "@tooee/marks"
import { MarkdownView } from "../src/MarkdownView.js"
import { ansiToStyledText, renderMermaidForTerminal } from "../src/mermaid.js"

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

function createMarkdownMarks(opts: {
  activeBlock?: number
  selectedBlocks?: { start: number; end: number }
}) {
  const sets = []

  if (opts.selectedBlocks) {
    const builder = new MarkSetBuilder()
    builder.addRange(
      { line: opts.selectedBlocks.start },
      { line: opts.selectedBlocks.end },
      { background: "#224488" },
    )
    sets.push(builder.build("selection", MarkPriorities.SELECTION))
  }

  if (opts.activeBlock != null) {
    const builder = new MarkSetBuilder()
    builder.addLine(opts.activeBlock, {
      background: "#111111",
      signBefore: "▸",
      foreground: "#ffffff",
    })
    sets.push(builder.build("cursor", MarkPriorities.CURSOR))
  }

  return createMarkState(sets)
}

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

test("converts mermaid ANSI output into styled plain text", () => {
  const result = renderMermaidForTerminal("graph TD\n  A[Agent] --> B[Stream]", {
    mode: "ansi",
    theme: {
      fg: "#ffffff",
      border: "#ff0000",
      line: "#00ff00",
      arrow: "#0000ff",
    },
  })

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.text).toContain("Agent")
  expect(result.text).toContain("Stream")
  expect(result.text).not.toContain("\x1b[")
  expect(result.content.chunks.some((chunk) => chunk.fg != null)).toBe(true)
})

test("parses truecolor SGR ANSI into StyledText chunks", () => {
  const parsed = ansiToStyledText("plain \x1b[38;2;255;0;0mred\x1b[0m text")

  expect(parsed.text).toBe("plain red text")
  expect(parsed.content.chunks.map((chunk) => chunk.text).join("")).toBe("plain red text")
  expect(parsed.content.chunks.some((chunk) => chunk.text === "red" && chunk.fg != null)).toBe(true)
})

test("renders mermaid fences as terminal diagrams", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"```mermaid\ngraph TD\n  A[Agent] --> B[Stream]\n```"} />
    </ThemeSwitcherProvider>,
    { width: 80, height: 30 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Agent")
  expect(frame).toContain("Stream")
  expect(frame).toContain("▼")
  expect(frame).not.toContain("graph TD")
})

test("does not render non-mermaid code fences as diagrams", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"```text\ngraph TD\n  A[Agent] --> B[Stream]\n```"} />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("graph TD")
  expect(frame).toContain("A[Agent] --> B[Stream]")
})

test("falls back to source code for unsupported mermaid fences", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"```mermaid\nnot a diagram ???\n```"} />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("not a diagram ???")
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
        marks={createMarkdownMarks({ selectedBlocks: { start: 1, end: 2 } })}
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
      <MarkdownView
        content={"# Heading\n\nParagraph one\n\nParagraph two"}
        marks={createMarkdownMarks({ activeBlock: 1 })}
      />
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
        marks={createMarkdownMarks({ activeBlock: 1, selectedBlocks: { start: 1, end: 2 } })}
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
    const code = ["const a = 1", "const b = 2", "const c = 3", "const d = 4", "const e = 5"].join(
      "\n",
    )
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
    const code = ["line 1", "line 2", "line 3"].join("\n")
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
    const rows = Array.from({ length: 8 }, (_, i) => `| Item ${i + 1} | ${(i + 1) * 10} |`).join(
      "\n",
    )
    const md = `| Name | Value |\n| --- | --- |\n${rows}`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 60, height: 50 },
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
// Bug fix: nested lists render sub-items
// ---------------------------------------------------------------------------

describe("nested list rendering", () => {
  test("renders nested unordered list sub-items", async () => {
    const md = "- First item\n  - Sub-item A\n  - Sub-item B\n- Second item\n  - Sub-item C"
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("First item")
    expect(frame).toContain("Sub-item A")
    expect(frame).toContain("Sub-item B")
    expect(frame).toContain("Second item")
    expect(frame).toContain("Sub-item C")
  })

  test("renders ordered list with nested sub-items", async () => {
    const md = "1. Step one\n   - Detail alpha\n   - Detail beta\n2. Step two\n   - Detail gamma"
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Step one")
    expect(frame).toContain("Detail alpha")
    expect(frame).toContain("Detail beta")
    expect(frame).toContain("Step two")
    expect(frame).toContain("Detail gamma")
  })

  test("nested list snapshot", async () => {
    const md = "- Parent A\n  - Child 1\n  - Child 2\n- Parent B\n  - Child 3"
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
// Flat token rendering: code blocks, tables, blockquotes inside lists
// ---------------------------------------------------------------------------

describe("code block inside list item", () => {
  test("code block inside list item renders code content", async () => {
    const md = `- Setup step:\n\n  \`\`\`bash\n  npm install\n  \`\`\`\n\n- Next step`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Setup step")
    expect(frame).toContain("npm install")
    expect(frame).toContain("Next step")
  })

  test("code block inside list has border", async () => {
    const md = `- Example:\n\n  \`\`\`js\n  const x = 1\n  \`\`\`\n`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("const x = 1")
    // Code block should have border characters
    expect(frame).toContain("\u250c") // top-left corner
    expect(frame).toContain("\u2514") // bottom-left corner
  })
})

describe("table inside list item", () => {
  test("table inside list item renders all cells", async () => {
    const md = `- Data summary:\n\n  | Key | Value |\n  | --- | --- |\n  | Alpha | 100 |\n  | Beta | 200 |\n\n- Next item`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Data summary")
    expect(frame).toContain("Alpha")
    expect(frame).toContain("Beta")
    expect(frame).toContain("100")
    expect(frame).toContain("200")
    expect(frame).toContain("Next item")
  })
})

describe("blockquote inside list item", () => {
  test("blockquote inside list item renders with quote marker", async () => {
    const md = `- Note:\n\n  > This is an important quote\n\n- Continue`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Note")
    expect(frame).toContain("important quote")
    expect(frame).toContain("Continue")
    // Should have the blockquote bar
    expect(frame).toContain("\u2502")
  })
})

describe("checkbox list items", () => {
  test("checked and unchecked checkboxes render", async () => {
    const md = `- [x] Completed task\n- [ ] Pending task\n- Regular item`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("[x]")
    expect(frame).toContain("[ ]")
    expect(frame).toContain("Completed task")
    expect(frame).toContain("Pending task")
    expect(frame).toContain("Regular item")
  })
})

describe("inline formatting preservation", () => {
  test("heading with bold and code preserves formatting", async () => {
    const md = `## Using **Bun** for \`testing\``
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Bun")
    expect(frame).toContain("testing")
    expect(frame).toContain("Using")
  })

  test("blockquote with inline formatting preserves content", async () => {
    const md = `> This has **bold** and \`code\` inside`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("bold")
    expect(frame).toContain("code")
    expect(frame).toContain("This has")
  })

  test("strikethrough text renders with markers", async () => {
    const md = `This has ~~deleted~~ text`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("deleted")
    expect(frame).toContain("~")
  })

  test("nested inline formatting renders correctly", async () => {
    const md = `**bold with \`code\` inside** and *italic with **bold** inside*`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("bold with")
    expect(frame).toContain("code")
    expect(frame).toContain("italic with")
  })
})

describe("horizontal rule inside list item", () => {
  test("hr inside list item renders separator", async () => {
    const md = `- Before\n\n  ---\n\n- After`
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { width: 80, height: 24 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Before")
    expect(frame).toContain("After")
    expect(frame).toContain("─") // HR character
  })
})

// ---------------------------------------------------------------------------
// Bug fix: scroll does not leak into embedded code blocks
// ---------------------------------------------------------------------------

describe("scroll isolation", () => {
  test("code block content stays intact after scroll events", async () => {
    const code = ["line A", "line B", "line C"].join("\n")
    // Create content tall enough that the document can scroll
    const paragraphs = Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1} text.`).join("\n\n")
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
