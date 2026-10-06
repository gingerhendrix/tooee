import { afterEach, describe, expect, test } from "bun:test";

import { MouseButtons } from "@opentui/core/testing";
import type { ActionDefinition } from "@tooee/commands";
import { TooeeProvider } from "@tooee/shell";
import type { DocumentCommandContext } from "@tooee/shell";
import {
  expectDefined,
  press,
  pressEnter,
  pressEscape,
  pressTab,
  testRender,
} from "@tooee/test-support";
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

const mount = async function mount({ outline = false, width = 100 } = {}) {
  documentContext = undefined;
  testSetup = await testRender(
    <TooeeProvider>
      <View contentProvider={provider} actions={actions} outline={outline} />
    </TooeeProvider>,
    { height: 40, kittyKeyboard: true, width }
  );
  await act(async () => {
    await Bun.sleep(100);
  });
  await testSetup.renderOnce();
};

afterEach(() => {
  testSetup?.renderer.destroy();
});

const keys = async function keys(...sequence: string[]) {
  for (const key of sequence) {
    // oxlint-disable-next-line no-await-in-loop -- each key must render before the next
    await press(testSetup, key);
  }
};

/** Let effects that run after a commit, such as the outline jump, settle. */
const settle = async function settle() {
  await act(async () => {
    await Bun.sleep(20);
  });
  await testSetup.renderOnce();
};

const probe = async function probe(): Promise<DocumentCommandContext> {
  await press(testSetup, "x");
  return expectDefined(documentContext);
};

const frame = () => testSetup.captureCharFrame();

/** The outline line that shows `text`, matched inside the panel border. */
const outlineLine = (text: string) => new RegExp(`│\\s*${text}\\s*│`, "u");

// Eight sections, each taller than half the 30-line test terminal.
const LONG_MARKDOWN = [
  "# Long",
  "Intro.",
  ...Array.from({ length: 8 }, (_section, part) =>
    [
      `## Part ${part}`,
      ...Array.from({ length: 6 }, (_paragraph, line) => `Part ${part} paragraph ${line}.`),
    ].join("\n\n")
  ),
].join("\n\n");
/**
 * Frame line of a heading after a jump: the title bar is line 0, and the
 * jump keeps three document lines above the heading.
 */
const JUMP_LINE = 4;

const mountLong = async function mountLong() {
  testSetup = await testRender(
    <TooeeProvider>
      <View
        contentProvider={{ load: () => ({ format: "markdown", markdown: LONG_MARKDOWN }) }}
        outline
      />
    </TooeeProvider>,
    { height: 30, kittyKeyboard: true, width: 100 }
  );
  await act(async () => {
    await Bun.sleep(100);
  });
  await testSetup.renderOnce();
};

/** Frame line that shows a heading in the document. */
const headingLine = (text: string) =>
  frame()
    .split("\n")
    .findIndex((line) => line.includes(`## ${text}`));

describe("Markdown outline panel", () => {
  test("is off by default, and g o opens and focuses it, then closes it", async () => {
    await mount();
    expect(frame()).not.toContain("Outline");

    await keys("g", "o");
    expect(frame()).toContain("▸ Outline");
    expect(frame()).toMatch(outlineLine("▸ Guide"));
    expect(frame()).toMatch(outlineLine("Install"));
    expect(frame()).toMatch(outlineLine("Keys"));

    await keys("g", "o");
    expect(frame()).not.toContain("Outline");
  });

  test("indents headings by depth", async () => {
    await mount({ outline: true });
    const lines = frame().split("\n");
    const column = (text: string) => {
      const pattern = new RegExp(`│[\\s▸]*${text}\\s*│`, "u");
      const line = expectDefined(lines.find((candidate) => pattern.test(candidate)));
      // The document can show the same text, so measure from the panel border.
      const at = line.lastIndexOf(text);
      return at - line.lastIndexOf("│", at);
    };
    expect(column("Install")).toBe(column("Guide") + 2);
    expect(column("Keys")).toBe(column("Install") + 2);
    expect(column("Limits")).toBe(column("Install"));
  });

  test("j and k move in the outline and enter jumps the document cursor", async () => {
    await mount();
    await keys("g", "o", "j", "j", "j", "k");
    // The document cursor did not move while the outline had focus.
    const before = await probe();
    expect(before.cursor).toBe(0);

    await pressEnter(testSetup);
    await settle();
    const after = await probe();
    expect(after.activeAnchor?.text).toBe("## Usage");
    expect(after.cursor).toBe(5);
    expect(frame()).not.toContain("▸ Outline");
    expect(frame()).toMatch(outlineLine("▸ Usage"));

    // Focus is back in the document, so j moves the document cursor.
    await keys("j");
    const moved = await probe();
    expect(moved.activeAnchor?.text).toBe("Usage paragraph.");
  });

  test("the current heading follows the document cursor", async () => {
    await mount({ outline: true });
    expect(frame()).toContain("Outline");
    expect(frame()).not.toContain("▸ Outline");
    expect(frame()).toMatch(outlineLine("▸ Guide"));

    await keys("j", "j", "j", "j", "j", "j", "j", "j");
    const context = await probe();
    expect(context.activeAnchor?.text).toBe("Keys paragraph.");
    expect(frame()).toMatch(outlineLine("▸ Keys"));
    expect(frame()).not.toMatch(outlineLine("▸ Guide"));
  });

  test("a jump into a closed fold opens the folds that hide the heading", async () => {
    await mount({ outline: true });
    await keys("j", "j", "j", "j", "j", "z", "c");
    expect(frame()).toContain("## Usage ⋯ 3 blocks");
    expect(frame()).toMatch(outlineLine("▸ Usage ⋯"));
    const folded = await probe();
    expect(folded.rowCount).toBe(ROW_COUNT - 3);

    // Focus starts on the current heading; j selects Keys, inside the fold.
    await keys("g", "o", "j");
    await pressEnter(testSetup);
    await settle();
    const context = await probe();
    expect(context.rowCount).toBe(ROW_COUNT);
    expect(context.activeAnchor?.text).toBe("### Keys");
    expect(context.cursor).toBe(7);
    expect(frame()).not.toContain("⋯ 3 blocks");
  });

  test("fold keys in the outline act on the selected heading", async () => {
    await mount();
    // Select Usage: Guide, Install, Usage.
    await keys("g", "o", "j", "j", "z", "c");
    expect(frame()).toContain("## Usage ⋯ 3 blocks");
    expect(frame()).toMatch(outlineLine("Usage ⋯"));
    expect(frame()).toContain("▸ Outline");
    const closed = await probe();
    expect(closed.rowCount).toBe(ROW_COUNT - 3);
    expect(closed.cursor).toBe(0);

    await keys("z", "o");
    expect(frame()).not.toContain("⋯");
    const opened = await probe();
    expect(opened.rowCount).toBe(ROW_COUNT);
  });

  test("z z in the outline toggles the selected heading's section", async () => {
    await mount();
    await keys("g", "o", "j", "z", "z");
    expect(frame()).toContain("## Install ⋯ 2 blocks");

    await keys("z", "z");
    expect(frame()).not.toContain("⋯");
    expect(frame()).toContain("Run the install step.");
  });

  test("closing a fold from the outline keeps the document cursor visible", async () => {
    await mount();
    await keys("j", "j", "j", "j", "j", "j", "j", "j");
    const before = await probe();
    expect(before.activeAnchor?.text).toBe("Keys paragraph.");

    // Focus starts on Keys; k selects Usage, which contains the cursor.
    await keys("g", "o", "k", "z", "c");
    const after = await probe();
    expect(after.activeAnchor?.text).toBe("## Usage");
    expect(after.cursor).toBe(5);
    expect(frame()).toContain("## Usage ⋯ 3 blocks");
  });

  test("z shift+m and z shift+r work while the outline has focus", async () => {
    await mount();
    await keys("g", "o", "z");
    await press(testSetup, "m", { shift: true });
    const closed = await probe();
    expect(closed.rowCount).toBe(1);
    expect(frame()).toContain("▸ Outline");

    await keys("z");
    await press(testSetup, "r", { shift: true });
    const opened = await probe();
    expect(opened.rowCount).toBe(ROW_COUNT);
  });

  test("escape returns focus to the document and tab keeps multi-select", async () => {
    await mount();
    await keys("g", "o");
    expect(frame()).toContain("▸ Outline");

    await pressEscape(testSetup);
    expect(frame()).toContain("Outline");
    expect(frame()).not.toContain("▸ Outline");

    await pressTab(testSetup);
    expect(frame()).toMatch(/Selected:\s*1/u);
    expect(frame()).toContain("Outline");
  });

  test("g o shows in which-key and in the command palette", async () => {
    await mount();
    await keys("g");
    expect(frame()).toContain("Toggle outline");
    await keys("o");
    await pressEscape(testSetup);

    await press(testSetup, ":");
    for (const char of "outline") {
      // oxlint-disable-next-line no-await-in-loop -- each key must render before the next
      await press(testSetup, char);
    }
    expect(frame()).toContain("Toggle outline");
  });

  test("a click on an outline heading jumps to it", async () => {
    await mount({ outline: true });
    const lines = frame().split("\n");
    const y = lines.findIndex((line) => outlineLine("Limits").test(line));
    const x = expectDefined(lines[y]).indexOf("Limits");
    await act(async () => {
      await testSetup.mockMouse.click(x, y, MouseButtons.LEFT);
    });
    await settle();
    const context = await probe();
    expect(context.activeAnchor?.text).toBe("## Limits");
    expect(context.cursor).toBe(9);
  });

  test("a jump scrolls the heading to near the top, from below and from above", async () => {
    await mountLong();
    // Focus starts on Long; five j presses select Part 4, below the view.
    await keys("g", "o", "j", "j", "j", "j", "j");
    await pressEnter(testSetup);
    await settle();
    expect(headingLine("Part 4")).toBe(JUMP_LINE);

    // Focus starts on Part 4; three k presses select Part 1, above the view.
    await keys("g", "o", "k", "k", "k");
    await pressEnter(testSetup);
    await settle();
    expect(headingLine("Part 1")).toBe(JUMP_LINE);
  });

  test("a jump into closed folds scrolls the heading to near the top", async () => {
    await mountLong();
    // The cursor starts on # Long, so z c folds the whole document.
    await keys("z", "c");
    expect(frame()).toContain("# Long ⋯");
    expect(headingLine("Part 6")).toBe(-1);

    await keys("g", "o", "j", "j", "j", "j", "j", "j", "j");
    await pressEnter(testSetup);
    await settle();
    expect(headingLine("Part 6")).toBe(JUMP_LINE);
    expect(frame()).toContain("Part 6 paragraph 0.");
  });

  test("a narrow terminal hides the outline and g o explains why", async () => {
    await mount({ outline: true, width: 50 });
    expect(frame()).not.toContain("Outline");

    await keys("g", "o");
    expect(frame()).toContain("The outline needs a wider terminal");
    expect(frame()).not.toContain("Outline─");
  });

  test("a document with no headings shows an empty outline", async () => {
    testSetup = await testRender(
      <TooeeProvider>
        <View
          contentProvider={{ load: () => ({ format: "markdown", markdown: "Only text." }) }}
          outline
        />
      </TooeeProvider>,
      { height: 20, width: 100 }
    );
    await act(async () => {
      await Bun.sleep(100);
    });
    await testSetup.renderOnce();
    expect(frame()).toContain("No headings");
  });
});
