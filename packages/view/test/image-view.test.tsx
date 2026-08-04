import { act } from "react";
import { afterEach, describe, expect, test } from "bun:test";
import { testRender } from "../../../test/support/test-render.ts";
import { TooeeProvider } from "@tooee/shell";
import { View } from "../src/view.js";
import type { ContentProvider } from "../src/types.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const renderProvider = async function renderProvider(provider: ContentProvider) {
  testSetup = await testRender(
    <TooeeProvider>
      <View contentProvider={provider} />
    </TooeeProvider>,
    { height: 60, width: 80 },
  );
  await testSetup.renderOnce();
  await act(async () => {
    await Bun.sleep(50);
  });
  await testSetup.renderOnce();
  return testSetup.captureCharFrame();
};

describe("View images", () => {
  test("renders native image content and reports load failures", async () => {
    const frame = await renderProvider({
      format: "image",
      load: () => ({ format: "image", src: "/missing/cover.png", title: "cover.png" }),
    });
    expect(frame).toContain("cover.png");
    expect(frame).toContain("Image failed to load: /missing/cover.png");
  });

  test("recognizes standard and Obsidian Markdown image embeds", async () => {
    const frame = await renderProvider({
      format: "markdown",
      load: () => ({
        format: "markdown",
        imageBasePath: "/missing",
        markdown: "![Standard](standard.png)\n\n![[obsidian.webp|20x8]]",
      }),
    });
    expect(frame).toContain("Image failed to load: Standard");
    expect(frame).toContain("Image failed to load: obsidian.webp");
    expect(frame).not.toContain("![[obsidian.webp|20x8]]");
  });
});
