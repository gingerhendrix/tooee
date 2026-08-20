import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach } from "bun:test";
import { ThemeProvider } from "@tooee/themes";
import { MarkdownView } from "@tooee/renderers";
import { DIFF_CODE_BLOCK_RENDERERS, parseDiffFenceOptions } from "../src/diff-code-block.js";
import { MULTI_FILE_PATCH } from "./fixtures.js";

let testSetup: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  testSetup?.renderer.destroy();
  testSetup = undefined;
});

const renderMarkdown = async function renderMarkdown(markdown: string, width = 100) {
  testSetup = await testRender(
    <ThemeProvider name="github" mode="dark">
      <MarkdownView content={markdown} codeBlockRenderers={DIFF_CODE_BLOCK_RENDERERS} />
    </ThemeProvider>,
    { height: 40, width },
  );
  await testSetup.renderOnce();
  return testSetup.captureCharFrame();
};

const lineWith = function lineWith(frame: string, needle: string): string {
  return frame.split("\n").find((line) => line.includes(needle)) ?? "";
};

const fence = function fence(info: string, body: string): string {
  return `# Changes\n\n\`\`\`${info}\n${body}\`\`\`\n`;
};

describe("diffCodeBlockRenderer", () => {
  test("renders a ```diff fence as a Hunk block", async () => {
    const frame = await renderMarkdown(fence("diff", MULTI_FILE_PATCH));
    expect(frame).toContain("Changes");
    expect(frame).toContain("@@ -1,3 +1,4 @@");
    expect(frame).toContain("const b = 22;");
    // Multi-file fences keep their file headers.
    expect(frame).toContain("src/a.ts");
    expect(frame).toContain("docs/notes.md");
  });

  test("renders a ```patch fence too", async () => {
    const frame = await renderMarkdown(fence("patch", MULTI_FILE_PATCH));
    expect(frame).toContain("@@ -1,3 +1,4 @@");
  });

  test("drops the file header when the fence holds a single file", async () => {
    const single = MULTI_FILE_PATCH.slice(0, MULTI_FILE_PATCH.indexOf("diff --git a/docs"));
    const frame = await renderMarkdown(fence("diff", single));
    expect(frame).toContain("@@ -1,3 +1,4 @@");
    expect(frame).not.toContain("+3 -2");
  });

  test("renders hunk header context once", async () => {
    const patch = `--- a/src/demo.ts
+++ b/src/demo.ts
@@ -1,3 +1,3 @@ function demo()
 const before = 1;
-const value = before;
+const value = before + 1;
 return value;
`;
    const frame = await renderMarkdown(fence("diff", patch));
    const hunkHeaderLine = lineWith(frame, "@@ -1,3 +1,3 @@ function demo()");
    expect(hunkHeaderLine.match(/function demo\(\)/gu)).toHaveLength(1);
  });

  test("falls back to the default code block for prose-style diff fences", async () => {
    const frame = await renderMarkdown(fence("diff", "- removed idea\n+ added idea\n"));
    expect(frame).toContain("- removed idea");
    expect(frame).toContain("+ added idea");
    expect(frame).not.toContain("@@");
  });

  test("falls back for a fence that is not a diff at all", async () => {
    const frame = await renderMarkdown(fence("diff", "just some text\n"));
    expect(frame).toContain("just some text");
  });

  test("honours nolines from the fence info string", async () => {
    const withLines = await renderMarkdown(fence("diff", MULTI_FILE_PATCH));
    const withoutLines = await renderMarkdown(fence("diff nolines", MULTI_FILE_PATCH));
    expect(lineWith(withLines, "const b = 22;")).toMatch(/\d/u);
    expect(lineWith(withoutLines, "const b = 22;")).not.toMatch(/\d\s+\+/u);
  });

  test("re-renders the block at the new width after a resize", async () => {
    const wide = await renderMarkdown(fence("diff split", MULTI_FILE_PATCH), 140);
    const wideLine = lineWith(wide, "const b = 22;");
    expect(wideLine).toContain("const b = 2;");

    const narrow = await renderMarkdown(fence("diff split", MULTI_FILE_PATCH), 70);
    const narrowLine = lineWith(narrow, "const b = 22;");
    expect(narrowLine).not.toContain("const b = 2;");
  });
});

describe("parseDiffFenceOptions", () => {
  test("reads layout, line-number and wrap options after the fence type", () => {
    expect(parseDiffFenceOptions("diff")).toEqual({
      layout: "stack",
      showLineNumbers: true,
      wrapLines: false,
    });
    expect(parseDiffFenceOptions("diff split nolines wrap")).toEqual({
      layout: "split",
      showLineNumbers: false,
      wrapLines: true,
    });
  });

  test("ignores unknown info-string words", () => {
    expect(parseDiffFenceOptions("patch changes.patch")).toEqual({
      layout: "stack",
      showLineNumbers: true,
      wrapLines: false,
    });
  });
});
