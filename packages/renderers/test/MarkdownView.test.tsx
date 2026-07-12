import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach } from "bun:test";
import type { TextBufferRenderable } from "@opentui/core";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { MarkPriorities, MarkSetBuilder, createMarkState } from "@tooee/marks";
import { MarkdownView } from "../src/MarkdownView.js";
import type { CodeBlockRenderer } from "../src/code-blocks.js";
import { decorationBindings } from "./support/bindings.js";
import { ansiToStyledText, renderMermaidForTerminal } from "../src/mermaid.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const createMarkdownDocument = function createMarkdownDocument(opts: {
  activeBlock?: number;
  selectedBlocks?: { start: number; end: number };
}) {
  const sets = [];

  if (opts.selectedBlocks) {
    const builder = new MarkSetBuilder();
    builder.addRange(
      { line: opts.selectedBlocks.start },
      { line: opts.selectedBlocks.end },
      { background: "#224488" },
    );
    sets.push(builder.build("selection", MarkPriorities.SELECTION));
  }

  if (opts.activeBlock != null) {
    const builder = new MarkSetBuilder();
    builder.addLine(opts.activeBlock, {
      background: "#111111",
      foreground: "#ffffff",
      signBefore: "▸",
    });
    sets.push(builder.build("cursor", MarkPriorities.CURSOR));
  }

  return decorationBindings(createMarkState(sets).sets);
};

test("renders heading text", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content="# Hello World" />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("Hello World");
  expect(frame).toContain("#");
});

test("renders list items", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"- First item\n- Second item\n- Third item"} />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("First item");
  expect(frame).toContain("Second item");
  expect(frame).toContain("Third item");
});

test("renders code blocks", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"```\nconst x = 1\n```"} />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("const x = 1");
});

test("converts mermaid ANSI output into styled plain text", () => {
  const result = renderMermaidForTerminal("graph TD\n  A[Agent] --> B[Stream]", {
    mode: "ansi",
    theme: {
      arrow: "#0000ff",
      border: "#ff0000",
      fg: "#ffffff",
      line: "#00ff00",
    },
  });

  expect(result.ok).toBe(true);
  if (!result.ok) {
    return;
  }

  expect(result.text).toContain("Agent");
  expect(result.text).toContain("Stream");
  expect(result.text).not.toContain("\u001B[");
  expect(result.content.chunks.some((chunk) => chunk.fg != null)).toBe(true);
});

test("parses truecolor SGR ANSI into StyledText chunks", () => {
  const parsed = ansiToStyledText("plain \u001B[38;2;255;0;0mred\u001B[0m text");

  expect(parsed.text).toBe("plain red text");
  expect(parsed.content.chunks.map((chunk) => chunk.text).join("")).toBe("plain red text");
  expect(parsed.content.chunks.some((chunk) => chunk.text === "red" && chunk.fg != null)).toBe(
    true,
  );
});

test("renders mermaid fences as terminal diagrams", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"```mermaid\ngraph TD\n  A[Agent] --> B[Stream]\n```"} />
    </ThemeSwitcherProvider>,
    { height: 30, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("Agent");
  expect(frame).toContain("Stream");
  expect(frame).toContain("▼");
  expect(frame).not.toContain("graph TD");

  await testSetup.rerender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"```mermaid\ngraph LR\n  C[Client] --> S[Server]\n```"} />
    </ThemeSwitcherProvider>,
  );
  await testSetup.renderOnce();
  const updatedFrame = testSetup.captureCharFrame();
  if (!updatedFrame.includes("Client") || !updatedFrame.includes("Server")) {
    throw new Error("Mermaid output did not update after the source changed");
  }
  if (updatedFrame.includes("Agent")) {
    throw new Error("Mermaid retained stale output after the source changed");
  }

  await testSetup.rerender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"```mermaid\nnot a diagram ???\n```"} />
    </ThemeSwitcherProvider>,
  );
  await testSetup.renderOnce();
  const failedFrame = testSetup.captureCharFrame();
  if (!failedFrame.includes("not a diagram ???") || failedFrame.includes("Client")) {
    throw new Error("Mermaid failure did not replace completed output with the source fallback");
  }
});

test("does not render non-mermaid code fences as diagrams", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"```text\ngraph TD\n  A[Agent] --> B[Stream]\n```"} />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("graph TD");
  expect(frame).toContain("A[Agent] --> B[Stream]");
});

test("falls back to source code for unsupported mermaid fences", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={"```mermaid\nnot a diagram ???\n```"} />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("not a diagram ???");
});

test("renders markdown table", async () => {
  const md = `| Name | Age | City |
| --- | --- | --- |
| Alice | 30 | London |
| Bob | 25 | Paris |`;
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={md} />
    </ThemeSwitcherProvider>,
    { height: 20, width: 60 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("Name");
  expect(frame).toContain("Alice");
  expect(frame).toContain("London");
  expect(frame).toContain("Bob");
});

test("selected blocks have gutter highlight", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView
        content={"# Heading\n\nParagraph one\n\nParagraph two\n\nParagraph three"}
        document={createMarkdownDocument({ selectedBlocks: { end: 2, start: 1 } })}
      />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("Paragraph one");
  expect(frame).toContain("Paragraph two");
});

test("active block renders with gutter", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView
        content={"# Heading\n\nParagraph one\n\nParagraph two"}
        document={createMarkdownDocument({ activeBlock: 1 })}
      />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("Heading");
  expect(frame).toContain("Paragraph one");
  expect(frame).toContain("Paragraph two");
});

test("selected blocks snapshot", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView
        content={"# Title\n\nFirst paragraph\n\nSecond paragraph\n\nThird paragraph"}
        document={createMarkdownDocument({ activeBlock: 1, selectedBlocks: { end: 2, start: 1 } })}
      />
    </ThemeSwitcherProvider>,
    { height: 20, width: 60 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toMatchSnapshot();
});

test("snapshot", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView
        content={
          "# Title\n\nSome paragraph text.\n\n- Item one\n- Item two\n\n```js\nconst x = 1\n```"
        }
      />
    </ThemeSwitcherProvider>,
    { height: 20, width: 60 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toMatchSnapshot();
});

// ---------------------------------------------------------------------------
// Bug fix: multi-line code blocks show all lines (height clamping fix)
// ---------------------------------------------------------------------------

describe("code block height", () => {
  test("multi-line code block shows all lines", async () => {
    const code = ["const a = 1", "const b = 2", "const c = 3", "const d = 4", "const e = 5"].join(
      "\n",
    );
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={`\`\`\`js\n${code}\n\`\`\``} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("const a = 1");
    expect(frame).toContain("const b = 2");
    expect(frame).toContain("const c = 3");
    expect(frame).toContain("const d = 4");
    expect(frame).toContain("const e = 5");
  });

  test("multi-line code block snapshot", async () => {
    const code = [
      "function greet(name) {",
      `  console.log(\`Hello, \${name}!\`)`,
      "  return true",
      "}",
    ].join("\n");
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={`# Code\n\n\`\`\`js\n${code}\n\`\`\``} />
      </ThemeSwitcherProvider>,
      { height: 20, width: 60 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Bug fix: content after code blocks/tables is correctly positioned
// ---------------------------------------------------------------------------

describe("content positioning after embedded blocks", () => {
  test("paragraph after multi-line code block is visible", async () => {
    const code = ["line 1", "line 2", "line 3"].join("\n");
    const md = `# Heading\n\n\`\`\`\n${code}\n\`\`\`\n\nThis text follows the code block.`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    // All code lines should be present
    expect(frame).toContain("line 1");
    expect(frame).toContain("line 2");
    expect(frame).toContain("line 3");
    // The paragraph after the code block must also be visible
    expect(frame).toContain("This text follows the code block.");
  });

  test("paragraph after table is visible", async () => {
    const md = `# Heading

| Key | Value |
| --- | --- |
| Alpha | 100 |
| Beta | 200 |

This text follows the table.`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Alpha");
    expect(frame).toContain("Beta");
    expect(frame).toContain("This text follows the table.");
  });

  test("content after code block does not overlap", async () => {
    const code = ["a = 1", "b = 2", "c = 3"].join("\n");
    const md = `\`\`\`\n${code}\n\`\`\`\n\nAfter code.`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 20, width: 60 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    const lines = frame.split("\n");

    // Find the line with "After code."
    const afterCodeLineIdx = lines.findIndex((l) => l.includes("After code."));
    expect(afterCodeLineIdx).toBeGreaterThan(-1);

    // Find the line with bottom border of the code block
    const bottomBorderIdx = lines.findIndex((l) => l.includes("\u2514"));
    expect(bottomBorderIdx).toBeGreaterThan(-1);

    // "After code." must be BELOW the bottom border (not overlapping)
    expect(afterCodeLineIdx).toBeGreaterThan(bottomBorderIdx);
  });
});

// ---------------------------------------------------------------------------
// Bug fix: table rendering without nested row-document
// ---------------------------------------------------------------------------

describe("inline table rendering", () => {
  test("table shows all rows and borders", async () => {
    const md = `| Name | Score |
| --- | --- |
| Alice | 95 |
| Bob | 87 |
| Carol | 92 |`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 20, width: 60 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Alice");
    expect(frame).toContain("Bob");
    expect(frame).toContain("Carol");
    // Header underline should be present (clean minimal style, no box borders)
    expect(frame).toContain("\u2500"); // horizontal line under header
  });

  test("table with many rows shows all content", async () => {
    const rows = Array.from({ length: 8 }, (_, i) => `| Item ${i + 1} | ${(i + 1) * 10} |`).join(
      "\n",
    );
    const md = `| Name | Value |\n| --- | --- |\n${rows}`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 50, width: 60 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Item 1");
    expect(frame).toContain("Item 8");
    expect(frame).toContain("Name");
    expect(frame).toContain("Value");
  });

  test("table snapshot", async () => {
    const md = `# Data

| Name | Age | City |
| --- | --- | --- |
| Alice | 30 | London |
| Bob | 25 | Paris |

Summary text.`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 20, width: 60 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toMatchSnapshot();
  });
});

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

Final paragraph.`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 30, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Mixed");
    expect(frame).toContain("def hello():");
    expect(frame).toContain("return 42");
    expect(frame).toContain("Middle paragraph.");
    expect(frame).toContain("Col A");
    expect(frame).toContain("X");
    expect(frame).toContain("Final paragraph.");
  });

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

Done.`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 30, width: 60 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Bug fix: nested lists render sub-items
// ---------------------------------------------------------------------------

describe("nested list rendering", () => {
  test("renders nested unordered list sub-items", async () => {
    const md = "- First item\n  - Sub-item A\n  - Sub-item B\n- Second item\n  - Sub-item C";
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("First item");
    expect(frame).toContain("Sub-item A");
    expect(frame).toContain("Sub-item B");
    expect(frame).toContain("Second item");
    expect(frame).toContain("Sub-item C");
  });

  test("renders ordered list with nested sub-items", async () => {
    const md = "1. Step one\n   - Detail alpha\n   - Detail beta\n2. Step two\n   - Detail gamma";
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Step one");
    expect(frame).toContain("Detail alpha");
    expect(frame).toContain("Detail beta");
    expect(frame).toContain("Step two");
    expect(frame).toContain("Detail gamma");
  });

  test("nested list snapshot", async () => {
    const md = "- Parent A\n  - Child 1\n  - Child 2\n- Parent B\n  - Child 3";
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 20, width: 60 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Flat token rendering: code blocks, tables, blockquotes inside lists
// ---------------------------------------------------------------------------

describe("code block inside list item", () => {
  test("code block inside list item renders code content", async () => {
    const md = `- Setup step:\n\n  \`\`\`bash\n  npm install\n  \`\`\`\n\n- Next step`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Setup step");
    expect(frame).toContain("npm install");
    expect(frame).toContain("Next step");
  });

  test("code block inside list has border", async () => {
    const md = `- Example:\n\n  \`\`\`js\n  const x = 1\n  \`\`\`\n`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("const x = 1");
    // Code block should have border characters
    expect(frame).toContain("\u250C"); // top-left corner
    expect(frame).toContain("\u2514"); // bottom-left corner
  });
});

describe("table inside list item", () => {
  test("table inside list item renders all cells", async () => {
    const md = `- Data summary:\n\n  | Key | Value |\n  | --- | --- |\n  | Alpha | 100 |\n  | Beta | 200 |\n\n- Next item`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Data summary");
    expect(frame).toContain("Alpha");
    expect(frame).toContain("Beta");
    expect(frame).toContain("100");
    expect(frame).toContain("200");
    expect(frame).toContain("Next item");
  });
});

describe("blockquote inside list item", () => {
  test("blockquote inside list item renders with quote marker", async () => {
    const md = `- Note:\n\n  > This is an important quote\n\n- Continue`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Note");
    expect(frame).toContain("important quote");
    expect(frame).toContain("Continue");
    // Should have the blockquote bar
    expect(frame).toContain("\u2502");
  });
});

describe("checkbox list items", () => {
  test("checked and unchecked checkboxes render", async () => {
    const md = `- [x] Completed task\n- [ ] Pending task\n- Regular item`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("[x]");
    expect(frame).toContain("[ ]");
    expect(frame).toContain("Completed task");
    expect(frame).toContain("Pending task");
    expect(frame).toContain("Regular item");
  });
});

describe("inline formatting preservation", () => {
  test("heading with bold and code preserves formatting", async () => {
    const md = `## Using **Bun** for \`testing\``;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Bun");
    expect(frame).toContain("testing");
    expect(frame).toContain("Using");
  });

  test("blockquote with inline formatting preserves content", async () => {
    const md = `> This has **bold** and \`code\` inside`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("bold");
    expect(frame).toContain("code");
    expect(frame).toContain("This has");
  });

  test("strikethrough text renders with markers", async () => {
    const md = `This has ~~deleted~~ text`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("deleted");
    expect(frame).toContain("~");
  });

  test("nested inline formatting renders correctly", async () => {
    const md = `**bold with \`code\` inside** and *italic with **bold** inside*`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("bold with");
    expect(frame).toContain("code");
    expect(frame).toContain("italic with");
  });
});

describe("horizontal rule inside list item", () => {
  test("hr inside list item renders separator", async () => {
    const md = `- Before\n\n  ---\n\n- After`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Before");
    expect(frame).toContain("After");
    expect(frame).toContain("─"); // HR character
  });
});

// ---------------------------------------------------------------------------
// Wide mermaid diagrams: no wrapping, horizontal scrolling
// ---------------------------------------------------------------------------

describe("wide mermaid diagram horizontal scrolling", () => {
  // Renders ~128 columns wide (six chained nodes), far wider than the
  // 60-column test terminal. Derived from the wide fixtures used in the
  // mermaid PoC evaluation.
  const wideMermaid = [
    "```mermaid",
    "flowchart LR",
    "  AlphaStation[Alpha station] --> BetaStation[Beta station] --> GammaStation[Gamma station] --> DeltaStation[Delta station] --> EpsilonStation[Epsilon station] --> ZetaTerminal[Zeta terminal]",
    "```",
  ].join("\n");

  test("wide diagram clips to the right instead of wrapping", async () => {
    const md = `${wideMermaid}\n\nAfter the diagram.`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 60 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    // Left edge of the diagram is visible
    expect(frame).toContain("Alpha station");
    // Content past the viewport is clipped, not wrapped onto new lines
    expect(frame).not.toContain("Zeta terminal");
    // The diagram is a single-row band: every line containing a node label
    // is intact (labels never wrap mid-word onto their own lines)
    expect(frame).not.toContain("ZetaTerminal");
    // The block keeps its height, so following content stays visible
    expect(frame).toContain("After the diagram.");
  });

  test("horizontal scroll moves diagram content", async () => {
    const registry: { current: Map<number, TextBufferRenderable> } = { current: new Map() };
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={wideMermaid} hScrollableBlocksRef={registry} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 60 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();

    // The mermaid block (block index 0) registered its text renderable
    const diagram = registry.current.get(0);
    expect(diagram).toBeDefined();
    if (!diagram) {
      return;
    }

    const before = testSetup.captureCharFrame();
    expect(before).toContain("Alpha station");
    expect(before).not.toContain("Zeta terminal");

    // Scroll all the way right (the scrollX setter clamps to content width)
    diagram.scrollX += 1000;
    await testSetup.renderOnce();

    const after = testSetup.captureCharFrame();
    expect(after).toContain("Zeta terminal");
    expect(after).not.toContain("Alpha station");

    // And back to the start
    diagram.scrollX -= 1000;
    await testSetup.renderOnce();

    const restored = testSetup.captureCharFrame();
    expect(restored).toContain("Alpha station");
    expect(restored).not.toContain("Zeta terminal");
  });

  test("narrow diagram fits without scrolling and renders unchanged", async () => {
    const registry: { current: Map<number, TextBufferRenderable> } = { current: new Map() };
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView
          content={"```mermaid\ngraph TD\n  A[Agent] --> B[Stream]\n```"}
          hScrollableBlocksRef={registry}
        />
      </ThemeSwitcherProvider>,
      { height: 30, width: 80 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain("Agent");
    expect(frame).toContain("Stream");
    expect(frame).toContain("▼");

    // Scrolling a fitting diagram is a no-op (scrollX clamps to 0)
    const diagram = registry.current.get(0);
    expect(diagram).toBeDefined();
    if (diagram) {
      diagram.scrollX += 1000;
    }
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toBe(frame);
  });

  test("narrow diagram snapshot", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={"```mermaid\ngraph TD\n  A[Agent] --> B[Stream]\n```"} />
      </ThemeSwitcherProvider>,
      { height: 20, width: 60 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toMatchSnapshot();
  });

  test("vertical wheel over a wide diagram still scrolls the document", async () => {
    const paragraphs = Array.from({ length: 30 }, (_, i) => `Paragraph ${i + 1} text.`).join(
      "\n\n",
    );
    const md = `${wideMermaid}\n\n${paragraphs}`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 16, width: 60 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();

    const before = testSetup.captureCharFrame();
    expect(before).toContain("Alpha station");

    // Wheel down over the diagram body
    const { mockMouse } = testSetup;
    for (let i = 0; i < 10; i++) {
      await mockMouse.scroll(30, 3, "down");
    }
    await testSetup.renderOnce();

    const after = testSetup.captureCharFrame();
    // The document scrolled: the diagram moved out of view and later
    // paragraphs became visible
    expect(after).not.toBe(before);
    expect(after).not.toContain("Alpha station");
  });

  test("shift+wheel over a wide diagram pans it horizontally", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={wideMermaid} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 60 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();

    const before = testSetup.captureCharFrame();
    expect(before).toContain("Alpha station");

    // Shift+wheel-down over the diagram body maps to pan-right
    const { mockMouse } = testSetup;
    for (let i = 0; i < 30; i++) {
      await mockMouse.scroll(30, 3, "down", { modifiers: { shift: true } });
    }
    await testSetup.renderOnce();

    const panned = testSetup.captureCharFrame();
    expect(panned).not.toContain("Alpha station");

    // Shift+wheel-up pans back left
    for (let i = 0; i < 30; i++) {
      await mockMouse.scroll(30, 3, "up", { modifiers: { shift: true } });
    }
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("Alpha station");
  });

  test("fg colors stay aligned with glyphs at partial scroll offsets", async () => {
    // Regression: translating a natural-width text inside a nested scrollbox
    // exercised the scissor-clip path, which misplaced style runs at some
    // offsets (arrow/line colors bleeding onto label letters). The viewport
    // path (text scrollX) must keep every glyph's color stable while panning.
    const registry: { current: Map<number, TextBufferRenderable> } = { current: new Map() };
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={wideMermaid} hScrollableBlocksRef={registry} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 60 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();

    const diagram = registry.current.get(0);
    expect(diagram).toBeDefined();
    if (!diagram) {
      return;
    }

    // Baseline at scroll 0: record the arrow glyph color and the label
    // letter color. Both glyph classes are color-unambiguous in the diagram.
    const spanColors = (glyphMatch: RegExp): Set<string> => {
      const colors = new Set<string>();
      for (const line of testSetup.captureSpans().lines) {
        for (const span of line.spans) {
          if (glyphMatch.test(span.text)) {
            colors.add(span.fg.toString());
          }
        }
      }
      return colors;
    };

    const arrowBaseline = spanColors(/►/u);
    const letterBaseline = spanColors(/[a-z]/u);
    expect(arrowBaseline.size).toBe(1);
    expect(letterBaseline.size).toBe(1);
    expect(arrowBaseline).not.toEqual(letterBaseline);

    // At every pan offset the arrow and letter colors must stay unchanged.
    const maxScrollX = diagram.maxScrollX;
    expect(maxScrollX).toBeGreaterThan(0);
    for (let offset = 1; offset <= maxScrollX; offset += 3) {
      diagram.scrollX = offset;
      await testSetup.renderOnce();
      expect({ colors: spanColors(/►/u), offset }).toEqual({ colors: arrowBaseline, offset });
      expect({ colors: spanColors(/[a-z]/u), offset }).toEqual({ colors: letterBaseline, offset });
    }
  });
});

// ---------------------------------------------------------------------------
// Wide code blocks (incl. ASCII diagrams): no wrapping, horizontal scrolling
// ---------------------------------------------------------------------------

describe("wide code block horizontal scrolling", () => {
  // A ~130-column ASCII diagram in a plain fenced code block, far wider than
  // the 60-column test terminal. Distinct markers at both ends.
  const wideAsciiRow =
    "[Alpha station] ──► [Beta station] ──► [Gamma station] ──► [Delta station] ──► [Epsilon station] ──► [Zeta terminal]";
  const wideCode = ["```", "┌──────┐", wideAsciiRow, "└──────┘", "```"].join("\n");

  test("wide code block clips to the right instead of wrapping", async () => {
    const md = `${wideCode}\n\nAfter the code.`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 60 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    // Left edge of the code block is visible
    expect(frame).toContain("Alpha station");
    // Content past the viewport is clipped, not wrapped onto new lines
    expect(frame).not.toContain("Zeta terminal");
    // The block keeps its height, so following content stays visible
    expect(frame).toContain("After the code.");
  });

  test("horizontal scroll moves code block content", async () => {
    const registry: { current: Map<number, TextBufferRenderable> } = { current: new Map() };
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={wideCode} hScrollableBlocksRef={registry} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 60 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();

    // The code block (block index 0) registered its renderable
    const codeBlock = registry.current.get(0);
    expect(codeBlock).toBeDefined();
    if (!codeBlock) {
      return;
    }

    const before = testSetup.captureCharFrame();
    expect(before).toContain("Alpha station");
    expect(before).not.toContain("Zeta terminal");

    // Scroll all the way right (the scrollX setter clamps to content width)
    codeBlock.scrollX += 1000;
    await testSetup.renderOnce();

    const after = testSetup.captureCharFrame();
    expect(after).toContain("Zeta terminal");
    expect(after).not.toContain("Alpha station");

    // And back to the start
    codeBlock.scrollX -= 1000;
    await testSetup.renderOnce();

    const restored = testSetup.captureCharFrame();
    expect(restored).toContain("Alpha station");
    expect(restored).not.toContain("Zeta terminal");
  });

  test("narrow code block fits without scrolling and renders unchanged", async () => {
    const registry: { current: Map<number, TextBufferRenderable> } = { current: new Map() };
    const md = "```\nconst a = 1\nconst b = 2\n```";
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} hScrollableBlocksRef={registry} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();

    expect(frame).toContain("const a = 1");
    expect(frame).toContain("const b = 2");

    // Scrolling a fitting code block is a no-op (scrollX clamps to 0)
    const codeBlock = registry.current.get(0);
    expect(codeBlock).toBeDefined();
    if (codeBlock) {
      codeBlock.scrollX += 1000;
    }
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toBe(frame);
  });

  test("shift+wheel over a wide code block pans it horizontally", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={wideCode} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 60 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();

    const before = testSetup.captureCharFrame();
    expect(before).toContain("Alpha station");

    // Shift+wheel-down over the code block body maps to pan-right
    const { mockMouse } = testSetup;
    for (let i = 0; i < 40; i++) {
      await mockMouse.scroll(30, 3, "down", { modifiers: { shift: true } });
    }
    await testSetup.renderOnce();

    const panned = testSetup.captureCharFrame();
    expect(panned).not.toContain("Alpha station");

    // Shift+wheel-up pans back left
    for (let i = 0; i < 40; i++) {
      await mockMouse.scroll(30, 3, "up", { modifiers: { shift: true } });
    }
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("Alpha station");
  });

  test("vertical wheel over a wide code block still scrolls the document", async () => {
    const paragraphs = Array.from({ length: 30 }, (_, i) => `Paragraph ${i + 1} text.`).join(
      "\n\n",
    );
    const md = `${wideCode}\n\n${paragraphs}`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 16, width: 60 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();

    const before = testSetup.captureCharFrame();
    expect(before).toContain("Alpha station");

    // Wheel down over the code block body
    const { mockMouse } = testSetup;
    for (let i = 0; i < 10; i++) {
      await mockMouse.scroll(30, 3, "down");
    }
    await testSetup.renderOnce();

    const after = testSetup.captureCharFrame();
    // The document scrolled: the code block moved out of view and later
    // paragraphs became visible
    expect(after).not.toBe(before);
    expect(after).not.toContain("Alpha station");
  });

  test("invalid mermaid fallback code block registers for panning", async () => {
    // An invalid mermaid fence falls back to a plain code block showing the
    // source; if that source is wide it must pan like any other code block.
    const wideInvalid = ["```mermaid", `not a diagram ${wideAsciiRow}`, "```"].join("\n");
    const registry: { current: Map<number, TextBufferRenderable> } = { current: new Map() };
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={wideInvalid} hScrollableBlocksRef={registry} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 60 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();

    const block = registry.current.get(0);
    expect(block).toBeDefined();
    if (!block) {
      return;
    }

    expect(testSetup.captureCharFrame()).toContain("not a diagram");
    expect(testSetup.captureCharFrame()).not.toContain("Zeta terminal");

    block.scrollX += 1000;
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("Zeta terminal");
  });
});

// ---------------------------------------------------------------------------
// Bug fix: scroll does not leak into embedded code blocks
// ---------------------------------------------------------------------------

describe("scroll isolation", () => {
  test("code block content stays intact after scroll events", async () => {
    const code = ["line A", "line B", "line C"].join("\n");
    // Create content tall enough that the document can scroll
    const paragraphs = Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1} text.`).join(
      "\n\n",
    );
    const md = `# Doc\n\n\`\`\`\n${code}\n\`\`\`\n\n${paragraphs}`;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} />
      </ThemeSwitcherProvider>,
      { height: 20, width: 80 },
    );
    await testSetup.renderOnce();

    // Capture frame before scrolling
    const frameBefore = testSetup.captureCharFrame();
    expect(frameBefore).toContain("line A");
    expect(frameBefore).toContain("line B");
    expect(frameBefore).toContain("line C");

    // Send scroll events at the code block position (roughly row 4-5, col 40)
    const { mockMouse } = testSetup;
    for (let i = 0; i < 3; i++) {
      await mockMouse.scroll(40, 4, "down");
    }
    await testSetup.renderOnce();

    const frameAfter = testSetup.captureCharFrame();
    // After scrolling down, if the code block is still in view,
    // all its lines should still be visible and intact.
    // If it scrolled out of view, that's fine too - the document scrolled.
    // The key assertion: no partial code block content (which would indicate
    // the code block scrolled internally while the document also scrolled).
    if (frameAfter.includes("line A")) {
      // Code block still in view - all lines should be present
      expect(frameAfter).toContain("line B");
      expect(frameAfter).toContain("line C");
    }
  });
});

// ---------------------------------------------------------------------------
// Custom code block renderers
// ---------------------------------------------------------------------------

describe("custom code block renderers", () => {
  const graphqlRenderer: CodeBlockRenderer = ({ text, theme, indent }): React.ReactNode => (
    <box style={{ marginBottom: 1, marginLeft: 1 + indent }}>
      <text content={`GraphQL query (${text.split("\n").length} lines)`} fg={theme.accent} />
    </box>
  );

  test("registered fence type renders custom output", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView
          content={"```graphql\nquery { user { id } }\n```"}
          codeBlockRenderers={{ graphql: graphqlRenderer }}
        />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("GraphQL query (1 lines)");
    expect(frame).not.toContain("query { user { id } }");
  });

  test("unregistered fence type falls back to the default code block", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView
          content={"```python\nprint('hi')\n```"}
          codeBlockRenderers={{ graphql: graphqlRenderer }}
        />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("print('hi')");
    expect(frame).not.toContain("GraphQL query");
    // Default code block chrome (bordered box)
    expect(frame).toContain("┌");
  });

  test("fence type matching is case-insensitive for fence and registration", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView
          content={"```GraphQL\nquery { a }\n```"}
          codeBlockRenderers={{ GRAPHQL: graphqlRenderer }}
        />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("GraphQL query (1 lines)");
  });

  test("only the first word of the fence info string is matched", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView
          content={"```graphql title=UserQuery lines\nquery { a }\n```"}
          codeBlockRenderers={{ graphql: graphqlRenderer }}
        />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("GraphQL query (1 lines)");
  });

  test("renderer receives the full info string", async () => {
    let seenInfo: string | undefined;
    const infoRenderer: CodeBlockRenderer = ({ info, theme }): React.ReactNode => {
      seenInfo = info;
      return <text content="custom" fg={theme.accent} />;
    };
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView
          content={"```graphql title=UserQuery\nquery { a }\n```"}
          codeBlockRenderers={{ graphql: infoRenderer }}
        />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    expect(seenInfo).toBe("graphql title=UserQuery");
  });

  test("renderer returning null falls back to the default code block", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView
          content={"```graphql\nquery { a }\n```"}
          codeBlockRenderers={{ graphql: () => null }}
        />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("query { a }");
  });

  test("renderer that throws falls back to the default code block", async () => {
    const throwingRenderer: CodeBlockRenderer = () => {
      throw new Error("renderer exploded");
    };
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView
          content={"```graphql\nquery { a }\n```"}
          codeBlockRenderers={{ graphql: throwingRenderer }}
        />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("query { a }");
  });

  test("mermaid still renders via the registry when custom renderers are provided", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView
          content={"```mermaid\ngraph TD\n  A[Agent] --> B[Stream]\n```"}
          codeBlockRenderers={{ graphql: graphqlRenderer }}
        />
      </ThemeSwitcherProvider>,
      { height: 30, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Agent");
    expect(frame).toContain("Stream");
    expect(frame).toContain("▼");
    expect(frame).not.toContain("graph TD");
  });

  test("user entry for mermaid overrides the built-in renderer", async () => {
    const overrideRenderer: CodeBlockRenderer = ({ theme }): React.ReactNode => (
      <text content="custom mermaid override" fg={theme.accent} />
    );
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView
          content={"```mermaid\ngraph TD\n  A[Agent] --> B[Stream]\n```"}
          codeBlockRenderers={{ mermaid: overrideRenderer }}
        />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("custom mermaid override");
    expect(frame).not.toContain("▼");
  });

  test("custom renderer inside a list item receives its indent", async () => {
    let seenIndent: number | undefined;
    const indentRenderer: CodeBlockRenderer = ({ indent, theme }): React.ReactNode => {
      seenIndent = indent;
      return <text content="indented custom block" fg={theme.accent} />;
    };
    const md = "- Step:\n\n  ```graphql\n  query { a }\n  ```";
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView content={md} codeBlockRenderers={{ graphql: indentRenderer }} />
      </ThemeSwitcherProvider>,
      { height: 24, width: 80 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("indented custom block");
    expect(seenIndent).toBeGreaterThan(0);
  });

  test("custom renderer can opt into horizontal panning via hScroll", async () => {
    const wideLine = `[Start] ${"─".repeat(100)} [Finish line]`;
    const hScrollRenderer: CodeBlockRenderer = ({
      text,
      theme,
      indent,
      hScroll,
    }): React.ReactNode => (
      <box style={{ marginBottom: 1, marginLeft: 1 + indent }}>
        <text
          ref={hScroll.register}
          content={text}
          wrapMode="none"
          onMouseScroll={hScroll.onMouseScroll}
          style={{ fg: theme.markdownText, height: 1 }}
        />
      </box>
    );
    const registry: { current: Map<number, TextBufferRenderable> } = { current: new Map() };
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownView
          content={`\`\`\`wide\n${wideLine}\n\`\`\``}
          codeBlockRenderers={{ wide: hScrollRenderer }}
          hScrollableBlocksRef={registry}
        />
      </ThemeSwitcherProvider>,
      { height: 24, width: 60 },
    );
    await testSetup.renderOnce();
    await testSetup.renderOnce();

    const block = registry.current.get(0);
    expect(block).toBeDefined();
    if (!block) {
      return;
    }

    const before = testSetup.captureCharFrame();
    expect(before).toContain("[Start]");
    expect(before).not.toContain("Finish line");

    block.scrollX += 1000;
    await testSetup.renderOnce();
    const after = testSetup.captureCharFrame();
    expect(after).toContain("Finish line");
    expect(after).not.toContain("[Start]");
  });
});
