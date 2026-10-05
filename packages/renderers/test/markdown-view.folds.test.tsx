import { afterEach, expect, test } from "bun:test";

import { expectDefined, testRender } from "@tooee/test-support";
import { ThemeSwitcherProvider } from "@tooee/themes";

import { flattenMarkdown } from "../src/markdown-blocks.js";
import { MarkdownView } from "../src/markdown-view.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

test("a folded heading shows its hidden block count and the gutter shows row numbers", async () => {
  const markdown = "# Title\n\nHidden one.\n\nHidden two.\n\n## Next\n\nShown.";
  const all = flattenMarkdown(markdown);
  const blocks = [0, 3, 4].map((index) => expectDefined(all[index]));
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView
        content={markdown}
        blocks={blocks}
        rowNumbers={[1, 4, 5]}
        foldedBlocks={new Map([[0, 2]])}
      />
    </ThemeSwitcherProvider>,
    { height: 16, width: 60 }
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("# Title ⋯ 2 blocks");
  expect(frame).not.toContain("Hidden one.");
  expect(frame).toMatch(/^\s*1\s+# Title/mu);
  expect(frame).toMatch(/^\s*4\s+## Next/mu);
  expect(frame).toMatch(/^\s*5\s+Shown\./mu);
});

test("a single hidden block uses the singular marker", async () => {
  const markdown = "# Title\n\nHidden.";
  const title = expectDefined(flattenMarkdown(markdown)[0]);
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView content={markdown} blocks={[title]} foldedBlocks={new Map([[0, 1]])} />
    </ThemeSwitcherProvider>,
    { height: 8, width: 60 }
  );
  await testSetup.renderOnce();
  expect(testSetup.captureCharFrame()).toContain("# Title ⋯ 1 block");
});
