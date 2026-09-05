import { testRender } from "@tooee/test-support";
import { test, expect, describe, afterEach } from "bun:test";
import { act } from "react";
import { ThemeProvider } from "@tooee/themes";
import { DiffView, effectiveLayout } from "../src/diff-view.js";
import { buildDiffModel } from "../src/model.js";
import { MULTI_FILE_PATCH, RENAME_AND_BINARY_PATCH } from "./fixtures.js";

let testSetup: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  testSetup?.renderer.destroy();
  testSetup = undefined;
});

const DEFAULT_SIZE = { height: 40, width: 100 };

const renderDiff = async function renderDiff(
  patch: string,
  props: Partial<Parameters<typeof DiffView>[0]> = {},
  size = DEFAULT_SIZE,
) {
  const model = buildDiffModel(patch);
  testSetup = await testRender(
    <ThemeProvider name="github" mode="dark">
      <DiffView rows={model.rows} {...props} />
    </ThemeProvider>,
    size,
  );
  await testSetup.renderOnce();
  return testSetup.captureCharFrame();
};

describe("DiffView", () => {
  test("renders every file header and hunk of a multi-file patch", async () => {
    const frame = await renderDiff(MULTI_FILE_PATCH);
    expect(frame).toContain("src/a.ts");
    expect(frame).toContain("docs/notes.md");
    expect(frame).toContain("@@ -1,3 +1,4 @@");
    expect(frame).toContain("@@ -20,3 +21,3 @@");
    expect(frame).toContain("const b = 22;");
    expect(frame).toContain("new note");
  });

  test("keeps collapsed-gap counts accurate across hunk rows", async () => {
    const frame = await renderDiff(MULTI_FILE_PATCH);
    // Between the two hunks of src/a.ts there are 16 unchanged lines. The count
    // is only right because hunk rows keep the whole-file metadata.
    expect(frame).toContain("16 unchanged lines");
  });

  test("split layout renders old and new side by side", async () => {
    const frame = await renderDiff(MULTI_FILE_PATCH, { layout: "split" });
    const changed = frame.split("\n").find((line) => line.includes("const b = 22;"));
    expect(changed).toBeDefined();
    expect(changed).toContain("const b = 2;");
  });

  test("split falls back to stack when the content area is too narrow", async () => {
    const frame = await renderDiff(MULTI_FILE_PATCH, { layout: "split", width: 40 });
    const changed = frame.split("\n").find((line) => line.includes("const b = 22;"));
    expect(changed).toBeDefined();
    expect(changed).not.toContain("const b = 2;");
  });

  test("renders binary files through their body row", async () => {
    const frame = await renderDiff(RENAME_AND_BINARY_PATCH);
    expect(frame).toContain("old.txt -> new.txt");
    expect(frame).toContain("img.png");
    expect(frame).toContain("Binary file skipped");
  });

  test("re-renders at the new width after a resize", async () => {
    const model = buildDiffModel(MULTI_FILE_PATCH);
    testSetup = await testRender(
      <ThemeProvider name="github" mode="dark">
        <DiffView rows={model.rows} layout="split" />
      </ThemeProvider>,
      { height: 40, width: 120 },
    );
    await testSetup.renderOnce();
    expect(
      testSetup
        .captureCharFrame()
        .split("\n")
        .find((line) => line.includes("const b = 22;")),
    ).toContain("const b = 2;");

    await act(async () => {
      testSetup?.resize(70, 40);
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    // Narrower than the split threshold, so the same content stacks.
    expect(
      testSetup
        .captureCharFrame()
        .split("\n")
        .find((line) => line.includes("const b = 22;")),
    ).not.toContain("const b = 2;");
  });
});

describe("effectiveLayout", () => {
  test("keeps split only above the minimum width", () => {
    expect(effectiveLayout("split", 120)).toBe("split");
    expect(effectiveLayout("split", 40)).toBe("stack");
    expect(effectiveLayout("stack", 200)).toBe("stack");
    expect(effectiveLayout(undefined, 200)).toBe("stack");
  });
});
