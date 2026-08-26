import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, beforeEach, describe } from "bun:test";
import { act } from "react";
import { copied } from "../../../test/support/clipboard-mock.ts";
import type { AnyContent, ContentProvider } from "../src/types.js";

const { TooeeProvider } = await import("@tooee/shell");
const { View } = await import("../src/view.js");

const PATCH = `diff --git a/src/a.ts b/src/a.ts
index 1111111..2222222 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,3 +1,4 @@
 const a = 1;
-const b = 2;
+const b = 22;
+const c = 3;
 export { a };
@@ -20,3 +21,3 @@ function tail() {
 const x = 1;
-const y = 2;
+const y = 3;
 const z = 4;
diff --git a/docs/notes.md b/docs/notes.md
index 3333333..4444444 100644
--- a/docs/notes.md
+++ b/docs/notes.md
@@ -1,2 +1,2 @@
-old note
+new note
 trailing
`;

const DIFF: AnyContent = { format: "diff", patch: PATCH, title: "changes.patch" };

const staticProvider = function staticProvider(content: AnyContent): ContentProvider {
  return { format: content.format, load: () => content };
};

let testSetup: Awaited<ReturnType<typeof testRender>>;

beforeEach(() => {
  copied.length = 0;
});

afterEach(() => {
  testSetup?.renderer.destroy();
});

const setup = async function setup(provider: ContentProvider) {
  const s = await testRender(
    <TooeeProvider>
      <View contentProvider={provider} />
    </TooeeProvider>,
    { height: 40, kittyKeyboard: true, width: 100 },
  );
  await s.renderOnce();
  await act(async () => {
    await Bun.sleep(100);
  });
  await s.renderOnce();
  return s;
};

const press = async function press(key: string, modifiers?: { shift?: boolean }) {
  await act(async () => {
    testSetup.mockInput.pressKey(key, modifiers);
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

/**
 * The status bar squeezes labels and wraps long values, so status is read back
 * by pattern rather than by exact `label:value` text.
 */
const cursorIndex = function cursorIndex(frame: string): number {
  const match = /Cursor:?\s*(?<index>\d+)/u.exec(frame);
  return Number(match?.groups?.index ?? -1);
};

const typeQuery = async function typeQuery(query: string) {
  await press("/");
  for (const char of query) {
    // oxlint-disable-next-line no-await-in-loop -- each key must be rendered before the next
    await press(char);
  }
  await act(async () => {
    testSetup.mockInput.pressEnter();
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

describe("diff content routing", () => {
  test("a .patch document opens the diff subview with diff status", async () => {
    testSetup = await setup(staticProvider(DIFF));
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("changes.patch");
    expect(frame).toContain("@@ -1,3 +1,4 @@");
    expect(frame).toMatch(/Files:\s*2/u);
    expect(frame).toMatch(/\+4 -3/u);
    expect(frame).toMatch(/Layout:?\s*stack/u);
  });
});

describe("diff navigation", () => {
  test("j steps hunk by hunk and the status shows file:hunk", async () => {
    testSetup = await setup(staticProvider(DIFF));
    expect(cursorIndex(testSetup.captureCharFrame())).toBe(0);

    await press("j");
    expect(cursorIndex(testSetup.captureCharFrame())).toBe(1);
    expect(testSetup.captureCharFrame()).toContain("At:src/a.ts:");
    await press("j");
    expect(cursorIndex(testSetup.captureCharFrame())).toBe(2);
  });

  test("] and [ jump between file headers", async () => {
    testSetup = await setup(staticProvider(DIFF));
    await press("]");
    expect(cursorIndex(testSetup.captureCharFrame())).toBe(3);

    await press("[");
    expect(cursorIndex(testSetup.captureCharFrame())).toBe(0);
  });

  test("f opens the file picker and jumps to the chosen file", async () => {
    testSetup = await setup(staticProvider(DIFF));
    await press("f");
    expect(testSetup.captureCharFrame()).toContain("docs/notes.md");

    for (const char of "notes") {
      // oxlint-disable-next-line no-await-in-loop -- each key must be rendered before the next
      await press(char);
    }
    await act(async () => {
      testSetup.mockInput.pressEnter();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    expect(cursorIndex(testSetup.captureCharFrame())).toBe(3);
  });

  test("s toggles the split layout", async () => {
    testSetup = await setup(staticProvider(DIFF));
    await press("s");
    const frame = testSetup.captureCharFrame();
    expect(frame).toMatch(/Layout:?\s*split/u);
    expect(frame.split("\n").find((line) => line.includes("const b = 22;"))).toContain(
      "const b = 2;",
    );

    await press("s");
    expect(testSetup.captureCharFrame()).toMatch(/Layout:?\s*stack/u);
  });
});

describe("diff search and copy", () => {
  test("search matches hunk patch text and moves the cursor to that hunk", async () => {
    testSetup = await setup(staticProvider(DIFF));
    await typeQuery("const y");
    expect(cursorIndex(testSetup.captureCharFrame())).toBe(2);

    await typeQuery("new note");
    expect(cursorIndex(testSetup.captureCharFrame())).toBe(4);
  });

  test("copying a selected hunk yields its patch text", async () => {
    testSetup = await setup(staticProvider(DIFF));
    await press("j");
    await press("v");
    await press("y");
    await press("v");

    expect(copied).toHaveLength(1);
    expect(copied[0]).toStartWith("@@ -1,3 +1,4 @@");
    expect(copied[0]).toContain("+const c = 3;");
  });
});
