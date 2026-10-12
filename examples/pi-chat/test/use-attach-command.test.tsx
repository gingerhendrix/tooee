import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { AskEditor, useAskEditor } from "@tooee/ask";
import type { AskEditorController } from "@tooee/ask";
import { AppLayout } from "@tooee/layout";
import { Panel, PanelGroup } from "@tooee/panels";
import { TooeeProvider } from "@tooee/shell";
import { pressEnter, pressTab, testRender } from "@tooee/test-support";
import type { TestSession } from "@tooee/test-support";
import { act } from "react";
import type { ReactNode } from "react";

import { useAttachCommand } from "../use-attach-command.js";

const RENDER_PASSES = 4;

let session: TestSession | undefined;

let controller: AskEditorController | undefined;

let dir = "";

let startDir = "";

const Input = function Input({ multiline }: { multiline: boolean }): ReactNode {
  const ask = useAskEditor({ commandScope: "test-input", disable: ["cancel"], multiline });
  ({ controller } = ask);
  useAttachCommand(ask.controller, ask.editor);

  return <AskEditor editor={ask.editor} />;
};

/** The demo's layout: AppLayout draws the chooser overlay above the panel. */
const Harness = function Harness({ multiline }: { multiline: boolean }): ReactNode {
  return (
    <AppLayout titleBar={{ title: "attach" }} statusBar={{ items: [] }}>
      <PanelGroup defaultActivePanelId="input">
        <Panel id="input" title="Input" initialMode="insert" style={{ height: 5 }}>
          <Input multiline={multiline} />
        </Panel>
      </PanelGroup>
    </AppLayout>
  );
};

const settle = async function settle(current: TestSession): Promise<void> {
  // The chooser loads its file list after it opens.
  for (let pass = 0; pass < RENDER_PASSES; pass += 1) {
    // oxlint-disable-next-line no-await-in-loop -- each frame must finish before the next
    await current.renderOnce();
    // oxlint-disable-next-line no-await-in-loop -- let the git ls-files call finish
    await act(async () => {
      await Bun.sleep(40);
    });
  }
};

const typeText = async function typeText(current: TestSession, text: string): Promise<void> {
  await act(async () => {
    await current.mockInput.typeText(text);
  });
  await current.renderOnce();
};

const setup = async function setup(multiline = false): Promise<TestSession> {
  session = await testRender(
    <TooeeProvider>
      <Harness multiline={multiline} />
    </TooeeProvider>,
    { height: 20, kittyKeyboard: true, width: 60 }
  );
  await settle(session);

  return session;
};

beforeAll(() => {
  startDir = process.cwd();
  dir = mkdtempSync(path.join(tmpdir(), "pi-chat-attach-"));
  mkdirSync(path.join(dir, "docs"));
  writeFileSync(path.join(dir, "docs/notes.md"), "# Notes\n");
  process.chdir(dir);
});

afterAll(() => {
  process.chdir(startDir);
  rmSync(dir, { force: true, recursive: true });
});

afterEach(() => {
  session?.renderer.destroy();
  session = undefined;
  controller = undefined;
});

describe("@ then Tab in the input", () => {
  test("opens the file chooser and inserts the chosen path after the @", async () => {
    const current = await setup();

    await typeText(current, "read @");
    await pressTab(current);
    await settle(current);

    expect(current.captureCharFrame()).toContain("Attach files");
    expect(current.captureCharFrame()).toContain("docs/notes.md");

    await pressEnter(current);
    await settle(current);

    expect(current.captureCharFrame()).not.toContain("Attach files");
    expect(controller?.getText()).toBe("read @docs/notes.md ");
  });

  test("works on the second line of the multiline editor", async () => {
    const current = await setup(true);

    await typeText(current, "first line");
    await pressEnter(current);
    await typeText(current, "@");
    await pressTab(current);
    await settle(current);

    expect(current.captureCharFrame()).toContain("Attach files");

    await pressEnter(current);
    await settle(current);

    expect(controller?.getText()).toBe("first line\n@docs/notes.md ");
  });

  test("Tab without an @ before the cursor does not open the chooser", async () => {
    const current = await setup();

    await typeText(current, "me@");
    await pressTab(current);
    await settle(current);

    expect(current.captureCharFrame()).not.toContain("Attach files");
  });
});
