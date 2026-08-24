import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { act } from "react";
import { useCommandContext } from "@tooee/commands";
import { TooeeProvider } from "@tooee/shell";
import { testRender } from "../../../test/support/test-render.ts";
import { DirectoryView } from "../src/directory-view.js";
import { View } from "../src/view.js";
import type { ContentProvider } from "../src/types.js";

let commandIds: string[] = [];
let testSetup: Awaited<ReturnType<typeof testRender>>;

const CommandProbe = function CommandProbe(): null {
  const { commands } = useCommandContext();
  commandIds = commands.map((command) => command.id);
  return null;
};

const render = async function render(node: React.ReactNode) {
  const setup = await testRender(
    <TooeeProvider>
      {node}
      <CommandProbe />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 80 },
  );
  await setup.renderOnce();
  await act(async () => {
    await Bun.sleep(100);
  });
  await setup.renderOnce();
  return setup;
};

const expectQToDestroy = async function expectQToDestroy(): Promise<void> {
  expect(commandIds).toContain("quit");
  let destroyed = false;
  testSetup.renderer.once("destroy", () => {
    destroyed = true;
  });

  await act(async () => {
    testSetup.mockInput.pressKey("q");
    await Promise.resolve();
  });

  expect(destroyed).toBe(true);
};

afterEach(() => {
  commandIds = [];
  testSetup?.renderer.destroy();
});

describe("bare view states", () => {
  test("q quits after a content error", async () => {
    const failingProvider: ContentProvider = {
      load: async () => {
        await Promise.resolve();
        throw new Error("missing file");
      },
    };
    testSetup = await render(<View contentProvider={failingProvider} />);

    expect(testSetup.captureCharFrame()).toContain("Error: missing file");
    await expectQToDestroy();
  });

  test("q quits an empty directory", async () => {
    const emptyDirectory = mkdtempSync(path.join(tmpdir(), "tooee-empty-directory-"));
    try {
      testSetup = await render(<DirectoryView dirPath={emptyDirectory} />);

      expect(testSetup.captureCharFrame()).toContain("No viewable files in directory");
      await expectQToDestroy();
    } finally {
      rmSync(emptyDirectory, { force: true, recursive: true });
    }
  });
});
