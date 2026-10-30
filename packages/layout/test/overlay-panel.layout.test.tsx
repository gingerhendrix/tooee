import { afterEach, describe, expect, test } from "bun:test";

import { testRender } from "@tooee/test-support";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { act } from "react";

import { OverlayPanel } from "../src/overlay-panel.js";

let testSetup: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  testSetup?.renderer.destroy();
  testSetup = undefined;
});

const renderPanel = async function renderPanel(width: number, height: number) {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <box position="absolute" top={1} left={0} right={0} bottom={1}>
        <OverlayPanel
          title="TITLE"
          prompt="PROMPT"
          hints="HINTS"
          inset={{ bottom: "15%", left: "15%", right: "15%", top: "15%" }}
        >
          <box flexGrow={1} />
        </OverlayPanel>
      </box>
    </ThemeSwitcherProvider>,
    { height, width }
  );
  // The container gets its size on the first layout. Its resize event then
  // resolves the insets, and the second frame paints whole-cell geometry.
  await act(async () => {
    await testSetup?.renderOnce();
  });
  await testSetup.renderOnce();

  return testSetup.captureCharFrame().split("\n");
};

describe("OverlayPanel geometry", () => {
  // A 38-row container gives 15% insets of 5.7 rows. Before the fix the panel
  // had fractional geometry and the hint bar landed on the bottom border.
  for (const [width, height] of [
    [80, 24],
    [120, 40],
    [140, 45],
    [200, 60],
  ] as const) {
    test(`keeps the hint bar above the bottom border at ${width}x${height}`, async () => {
      const rows = await renderPanel(width, height);
      const bottom = rows.findLastIndex((row) => row.includes("┘"));
      const hint = rows.findIndex((row) => row.includes("HINTS"));

      expect(rows[bottom]).toContain("└──");
      expect(hint).toBe(bottom - 1);
      expect(rows.some((row) => row.includes("PROMPT"))).toBe(true);
    });
  }

  test("resolves percentage insets to whole cells of its container", async () => {
    const rows = await renderPanel(120, 40);
    const top = rows.findIndex((row) => row.includes("┌"));
    const bottom = rows.findLastIndex((row) => row.includes("┘"));

    // Container rows 1..38; 15% of 38 rounds to 6 cells on each edge.
    expect(top).toBe(1 + 6);
    expect(bottom).toBe(1 + 38 - 6 - 1);
  });
});
