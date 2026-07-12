import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, beforeEach, describe } from "bun:test";
import { act } from "react";
import { copied } from "../../../test/support/clipboard-mock.ts";
import type { AnyContent, ContentProvider } from "../src/types.js";

const { TooeeProvider } = await import("@tooee/shell");
const { MarkSetBuilder, MarkPriorities } = await import("@tooee/marks");
const { View } = await import("../src/View.js");

function staticProvider(content: AnyContent, marks?: ContentProvider["marks"]): ContentProvider {
  return { format: content.format, load: () => content, marks };
}

const CODE: AnyContent = {
  format: "code",
  code: ["alpha", "beta", "gamma", "alpha again"].join("\n"),
  language: "text",
};

const TABLE: AnyContent = {
  format: "table",
  columns: [
    { key: "name", header: "Name" },
    { key: "role", header: "Role" },
  ],
  rows: [
    { name: "Alice", role: "dev" },
    { name: "Bob", role: "ops" },
    { name: "Carol", role: "dev" },
  ],
};

const MARKDOWN: AnyContent = {
  format: "markdown",
  markdown: "First.\n\nSecond.\n\nThird.",
};

let testSetup: Awaited<ReturnType<typeof testRender>>;

beforeEach(() => {
  copied.length = 0;
});

afterEach(() => {
  testSetup?.renderer.destroy();
});

async function setup(provider: ContentProvider) {
  const s = await testRender(
    <TooeeProvider>
      <View contentProvider={provider} />
    </TooeeProvider>,
    { width: 80, height: 24, kittyKeyboard: true },
  );
  await s.renderOnce();
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100));
  });
  await s.renderOnce();
  return s;
}

async function press(key: string, modifiers?: { shift?: boolean }) {
  await act(async () => {
    testSetup.mockInput.pressKey(key, modifiers);
  });
  await testSetup.renderOnce();
}

async function typeQuery(query: string) {
  await press("/");
  for (const char of query) {
    await press(char);
  }
  await act(async () => {
    testSetup.mockInput.pressEnter();
  });
  await testSetup.renderOnce();
}

describe("search over migrated subviews", () => {
  test("a code View jumps the cursor to the first real match, n cycles", async () => {
    testSetup = await setup(staticProvider(CODE));
    expect(testSetup.captureCharFrame()).toMatch(/Cursor:\s*0/);

    await typeQuery("gamma");
    expect(testSetup.captureCharFrame()).toMatch(/Cursor:\s*2/);

    await typeQuery("alpha");
    expect(testSetup.captureCharFrame()).toMatch(/Cursor:\s*0/);
    await press("n");
    expect(testSetup.captureCharFrame()).toMatch(/Cursor:\s*3/);
  });

  test("a table View searches across every column", async () => {
    testSetup = await setup(staticProvider(TABLE));

    await typeQuery("ops");
    expect(testSetup.captureCharFrame()).toMatch(/Cursor:\s*1/);

    await typeQuery("carol");
    expect(testSetup.captureCharFrame()).toMatch(/Cursor:\s*2/);
  });

  test("a markdown View searches block source", async () => {
    testSetup = await setup(staticProvider(MARKDOWN));

    await typeQuery("Third");
    expect(testSetup.captureCharFrame()).toMatch(/Cursor:\s*2/);
  });
});

describe("copy over migrated subviews", () => {
  test("a code View copies the selected line range", async () => {
    testSetup = await setup(staticProvider(CODE));
    await press("j");
    await press("v");
    await press("j");
    await press("y");

    expect(copied).toEqual(["beta\ngamma"]);
  });

  test("a table View copies toggled rows as tab-separated cells", async () => {
    testSetup = await setup(staticProvider(TABLE));
    await act(async () => {
      testSetup.mockInput.pressTab();
    });
    await testSetup.renderOnce();
    await press("j");
    await press("j");
    await act(async () => {
      testSetup.mockInput.pressTab();
    });
    await testSetup.renderOnce();

    await press("v");
    await press("y");

    expect(copied).toEqual(["Alice\tdev\nCarol\tdev"]);
  });
});

describe("decoration composition", () => {
  test("provider marks paint alongside the controller's cursor layer", async () => {
    const builder = new MarkSetBuilder();
    builder.addLine(2, { signBefore: "■", foreground: "#ff0000" });
    const marks = [builder.build("provider:test", MarkPriorities.DIAGNOSTIC)];

    testSetup = await setup(staticProvider(CODE, marks));
    const frame = testSetup.captureCharFrame();

    // Cursor sign (row 0) from the controller, provider sign (row 2) from the mark set.
    expect(frame).toContain("▸");
    expect(frame).toContain("■");
  });
});
