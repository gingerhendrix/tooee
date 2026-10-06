import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { ActionDefinition } from "@tooee/commands";
import { TooeeProvider } from "@tooee/shell";
import type { DocumentCommandContext } from "@tooee/shell";
import { copied, expectDefined, press, testRender } from "@tooee/test-support";
import { act } from "react";

import type { ContentProvider } from "../src/types.js";
import { View } from "../src/view.js";

// Rows: 0 # Guide | 1 p | 2 ## Install | 3 p | 4 code | 5 ## Usage | 6 p
//       7 ### Keys | 8 p | 9 ## Limits | 10 p
const MARKDOWN = [
  "# Guide",
  "Intro paragraph.",
  "## Install",
  "Run the install step.",
  "```bash\nbun add @tooee/view\n```",
  "## Usage",
  "Usage paragraph.",
  "### Keys",
  "Keys paragraph.",
  "## Limits",
  "Limits paragraph.",
].join("\n\n");

const ROW_COUNT = 11;

const provider: ContentProvider = {
  load: () => ({ format: "markdown", markdown: MARKDOWN }),
};

let testSetup: Awaited<ReturnType<typeof testRender>>;

let documentContext: DocumentCommandContext | undefined;

const actions: ActionDefinition[] = [
  {
    handler: (context) => {
      documentContext = context.document;
    },
    hotkey: "x",
    id: "probe",
    modes: ["cursor"],
    title: "Probe document",
  },
];

beforeEach(async () => {
  copied.length = 0;
  documentContext = undefined;
  testSetup = await testRender(
    <TooeeProvider>
      <View contentProvider={provider} actions={actions} />
    </TooeeProvider>,
    { height: 40, kittyKeyboard: true, width: 80 }
  );
  await act(async () => {
    await Bun.sleep(100);
  });
  await testSetup.renderOnce();
});

afterEach(() => {
  testSetup?.renderer.destroy();
});

const keys = async function keys(...sequence: string[]) {
  for (const key of sequence) {
    // oxlint-disable-next-line no-await-in-loop -- each key must render before the next
    await press(testSetup, key);
  }
};

const probe = async function probe(): Promise<DocumentCommandContext> {
  await press(testSetup, "x");

  return expectDefined(documentContext);
};

const frame = () => testSetup.captureCharFrame();

describe("Markdown heading folds", () => {
  test("z a closes the heading at the cursor and opens it again", async () => {
    await keys("j", "j");
    const probed1 = await probe();
    expect(probed1.activeAnchor?.text).toBe("## Install");

    await keys("z", "a");
    expect(frame()).toContain("## Install ⋯ 2 blocks");
    expect(frame()).not.toContain("Run the install step.");
    const folded = await probe();
    expect(folded.rowCount).toBe(ROW_COUNT - 2);
    expect(folded.cursor).toBe(2);

    await keys("z", "a");
    expect(frame()).toContain("Run the install step.");
    expect(frame()).not.toContain("⋯");
    const probed2 = await probe();
    expect(probed2.rowCount).toBe(ROW_COUNT);
  });

  test("j skips a closed fold and the gutter keeps document numbers", async () => {
    await keys("j", "j", "z", "c", "j");
    const context = await probe();
    expect(context.cursor).toBe(3);
    expect(context.activeAnchor?.text).toBe("## Usage");
    // Gutter numbers jump from 3 to 6 over the hidden rows.
    expect(frame()).toMatch(/^\s*3\s+## Install/mu);
    expect(frame()).toMatch(/^\s*6▸\s+## Usage/mu);
  });

  test("closing a fold over the cursor moves the cursor to its heading", async () => {
    await keys("j", "j", "j", "j");
    const probed3 = await probe();
    expect(probed3.activeAnchor?.text).toContain("bun add");

    await keys("z", "c");
    const context = await probe();
    expect(context.cursor).toBe(2);
    expect(context.activeAnchor?.text).toBe("## Install");
  });

  test("z c on a closed heading closes the enclosing fold", async () => {
    await keys("j", "j", "z", "c", "z", "c");
    const context = await probe();
    expect(context.rowCount).toBe(1);
    expect(context.cursor).toBe(0);
    expect(frame()).toContain("# Guide ⋯ 10 blocks");

    await keys("z", "o");
    // The inner Install fold kept its closed state.
    expect(frame()).toContain("## Install ⋯ 2 blocks");
  });

  test("z shift+m closes every fold and z shift+r opens them all", async () => {
    await keys("j", "j", "j", "j", "j", "j", "j", "j");
    const probed4 = await probe();
    expect(probed4.activeAnchor?.text).toBe("Keys paragraph.");

    await press(testSetup, "z");
    await press(testSetup, "m", { shift: true });
    const closed = await probe();
    expect(closed.rowCount).toBe(1);
    expect(closed.cursor).toBe(0);

    await press(testSetup, "z");
    await press(testSetup, "r", { shift: true });
    const opened = await probe();
    expect(opened.rowCount).toBe(ROW_COUNT);
    expect(opened.cursor).toBe(0);
    expect(frame()).toContain("Keys paragraph.");
  });

  test("search and copy see only the visible rows", async () => {
    await keys("j", "j", "z", "c");

    await press(testSetup, "/");

    for (const char of "install step") {
      // oxlint-disable-next-line no-await-in-loop -- each key must render before the next
      await press(testSetup, char);
    }

    await act(async () => {
      testSetup.mockInput.pressEnter();
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    const probed5 = await probe();
    expect(probed5.cursor).toBe(2);
    expect(frame()).not.toContain("Run the install step.");

    await keys("y", "y");
    expect(copied).toEqual(["## Install"]);
  });

  test("z a inside a body closes the innermost heading around it", async () => {
    await keys("j", "j", "j", "j", "j", "j");
    const probed6 = await probe();
    expect(probed6.activeAnchor?.text).toBe("Usage paragraph.");

    await keys("z", "a");
    const context = await probe();
    expect(context.activeAnchor?.text).toBe("## Usage");
    expect(context.rowCount).toBe(ROW_COUNT - 3);
    expect(frame()).toContain("## Usage ⋯ 3 blocks");
  });

  test("z z closes the block's fold when it is open and opens it when it is closed", async () => {
    await keys("j", "j", "j");
    const probed7 = await probe();
    expect(probed7.activeAnchor?.text).toBe("Run the install step.");

    await keys("z", "z");
    expect(frame()).toContain("## Install ⋯ 2 blocks");
    const closed = await probe();
    expect(closed.cursor).toBe(2);
    expect(closed.rowCount).toBe(ROW_COUNT - 2);

    await keys("z", "z");
    expect(frame()).toContain("Run the install step.");
    const opened = await probe();
    expect(opened.rowCount).toBe(ROW_COUNT);
    expect(opened.activeAnchor?.text).toBe("## Install");
  });

  test("z z shows in which-key under z", async () => {
    await keys("z");
    expect(frame()).toContain("Open or close fold");
  });
});
