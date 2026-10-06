import { afterEach, expect, test } from "bun:test";

import type { ActionDefinition } from "@tooee/commands";
import { TooeeProvider } from "@tooee/shell";
import type { DocumentCommandContext } from "@tooee/shell";
import { expectDefined, press, testRender } from "@tooee/test-support";
import { act } from "react";

import type { ContentProvider } from "../src/types.js";
import { View } from "../src/view.js";

// Guide markers are HTML blocks; diff fences and wrapped prose still occupy one row each.
const MARKDOWN = [
  "<!-- guide:meta range=base..head -->",
  "# Review",
  ...Array.from({ length: 6 }, (_, index) =>
    [
      `## Change ${index}`,
      "A paragraph long enough to wrap in a narrow terminal and exercise block geometry.",
      `<!-- guide:hunks path=change-${index}.ts -->`,
      "```diff\n--- a/change.ts\n+++ b/change.ts\n@@ -1 +1 @@\n-before\n+after\n```",
      "<!-- /guide:hunks -->",
    ].join("\n\n")
  ),
  "Final visible paragraph.",
  "<!-- trailing invisible marker -->",
].join("\n\n");

// Title + six heading/prose/diff groups + final paragraph.
const ROW_COUNT = 20;

const provider: ContentProvider = {
  load: () => ({ format: "markdown", markdown: MARKDOWN }),
};

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

test.each([50, 100])(
  "Markdown G and j stop at the final visible block at width %i",
  async (width) => {
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

    testSetup = await testRender(
      <TooeeProvider>
        <View contentProvider={provider} actions={actions} />
      </TooeeProvider>,
      { height: 24, kittyKeyboard: true, width }
    );
    await act(async () => {
      await Bun.sleep(100);
    });
    await testSetup.renderOnce();
    await press(testSetup, "g", { shift: true });
    expect(testSetup.captureCharFrame()).toContain("Final visible paragraph.");
    await press(testSetup, "x");
    expect(expectDefined(documentContext).rowCount).toBe(ROW_COUNT);
    expect(expectDefined(documentContext).cursor).toBe(ROW_COUNT - 1);
    expect(expectDefined(documentContext).activeAnchor?.text).toContain("Final visible paragraph.");

    await press(testSetup, "g");
    await press(testSetup, "g");
    await press(testSetup, "x");
    expect(expectDefined(documentContext).cursor).toBe(0);

    for (let index = 1; index < ROW_COUNT; index += 1) {
      // oxlint-disable-next-line no-await-in-loop -- each cursor move must render before the next key
      await press(testSetup, "j");
    }

    expect(testSetup.captureCharFrame()).toContain("Final visible paragraph.");
    const bottom = testSetup.captureCharFrame();

    for (let index = 0; index < 25; index += 1) {
      // oxlint-disable-next-line no-await-in-loop -- verify repeated moves against the settled bottom frame
      await press(testSetup, "j");
    }

    expect(testSetup.captureCharFrame()).toBe(bottom);
    await press(testSetup, "x");
    expect(expectDefined(documentContext).cursor).toBe(ROW_COUNT - 1);
  }
);
