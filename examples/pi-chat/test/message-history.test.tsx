import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { Panel, PanelGroup, usePanels } from "@tooee/panels";
import { TooeeProvider } from "@tooee/shell";
import { copied, press, pressEnter, pressTab, testRender } from "@tooee/test-support";
import type { TestSession } from "@tooee/test-support";
import { act, useState } from "react";
import type { ReactNode } from "react";

import { initialChatState } from "../chat-state.js";
import type { ChatState, ChatTurn } from "../chat-state.js";
import { MessageHistory } from "../message-history.js";

const RENDER_PASSES = 6;

// The sign column is first, inside the panel border when there is one.
const CURSOR_ROW = /^│?▸/u;

const longOutput = Array.from({ length: 8 }, (_, index) => `line ${index + 1}`).join("\n");

const user: ChatTurn = {
  aborted: false,
  id: 1,
  parts: [{ kind: "text", text: "list the files" }],
  role: "user",
  streaming: false,
};

const reply: ChatTurn = {
  aborted: false,
  id: 2,
  model: "openrouter/flash",
  parts: [
    {
      args: '{"path":"."}',
      id: "call-1",
      kind: "toolCall",
      name: "ls",
      result: { images: [], isError: false, text: longOutput },
      status: "done",
    },
    { kind: "text", text: "Eight lines." },
  ],
  role: "assistant",
  streaming: false,
};

const stateWith = function stateWith(turns: readonly ChatTurn[]): ChatState {
  return { ...initialChatState, phase: "ready", turns };
};

let session: TestSession | undefined;

let updateTurns: ((turns: readonly ChatTurn[]) => void) | undefined;

const Harness = function Harness({ initial }: { initial: readonly ChatTurn[] }): ReactNode {
  const [turns, setTurns] = useState(initial);
  updateTurns = setTurns;

  return (
    <box flexDirection="column" width="100%" height="100%">
      <MessageHistory state={stateWith(turns)} />
    </box>
  );
};

const ActivePanel = function ActivePanel(): ReactNode {
  const { activePanelId } = usePanels();

  return <text content={`active:${activePanelId ?? "none"}`} />;
};

/** The demo's layout: the history panel above a second panel. */
const PanelHarness = function PanelHarness({ turns }: { turns: readonly ChatTurn[] }): ReactNode {
  return (
    <box flexDirection="column" width="100%" height="100%">
      <PanelGroup defaultActivePanelId="history">
        <Panel id="history" title="Messages" style={{ flexGrow: 1 }}>
          <MessageHistory state={stateWith(turns)} />
        </Panel>
        <Panel id="input" title="Input" style={{ height: 3 }}>
          <ActivePanel />
        </Panel>
      </PanelGroup>
    </box>
  );
};

const settle = async function settle(current: TestSession): Promise<void> {
  // The <markdown> element fills in on a later frame, so render a few times.
  for (let pass = 0; pass < RENDER_PASSES; pass += 1) {
    // oxlint-disable-next-line no-await-in-loop -- each frame must finish before the next
    await current.renderOnce();
    // oxlint-disable-next-line no-await-in-loop -- give the markdown parser time between frames
    await Bun.sleep(20);
  }
};

const setup = async function setup(
  turns: readonly ChatTurn[],
  inPanels = false
): Promise<TestSession> {
  session = await testRender(
    <TooeeProvider>
      {inPanels ? <PanelHarness turns={turns} /> : <Harness initial={turns} />}
    </TooeeProvider>,
    { height: 30, kittyKeyboard: true, width: 70 }
  );
  await settle(session);

  return session;
};

/** The frame line that holds the cursor sign (the active panel title also has one). */
const cursorLine = function cursorLine(current: TestSession): string {
  return (
    current
      .captureCharFrame()
      .split("\n")
      .find((line) => CURSOR_ROW.test(line)) ?? ""
  );
};

beforeEach(() => {
  copied.length = 0;
});

afterEach(() => {
  session?.renderer.destroy();
  session = undefined;
  updateTurns = undefined;
});

describe("MessageHistory", () => {
  test("shows the empty state before the first turn", async () => {
    const current = await setup([]);

    expect(current.captureCharFrame()).toContain("No messages yet.");
  });

  test("opens with the cursor on the last row", async () => {
    const current = await setup([user, reply]);

    expect(cursorLine(current)).toContain("Eight lines.");
  });

  test("j and k move the cursor between rows", async () => {
    const current = await setup([user, reply]);

    await press(current, "k");
    expect(cursorLine(current)).toContain('ls {"path":"."} · done');

    await press(current, "k");
    expect(cursorLine(current)).toContain("openrouter/flash");

    await press(current, "j");
    expect(cursorLine(current)).toContain('ls {"path":"."} · done');
  });

  test("Enter shows and hides the full output of the block at the cursor", async () => {
    const current = await setup([user, reply]);

    expect(current.captureCharFrame()).not.toContain("line 8");

    await press(current, "k");
    await pressEnter(current);
    await settle(current);
    expect(current.captureCharFrame()).toContain("line 8");

    await pressEnter(current);
    await settle(current);
    expect(current.captureCharFrame()).not.toContain("line 8");
  });

  test("y m copies the text of the turn at the cursor", async () => {
    const current = await setup([user, reply]);

    await press(current, "k");
    await press(current, "y");
    await press(current, "m");

    expect(copied).toEqual(["Eight lines."]);
  });

  test("the cursor follows new rows while it is on the last row", async () => {
    const current = await setup([user]);

    expect(cursorLine(current)).toContain("list the files");

    await act(async () => {
      updateTurns?.([user, reply]);
      await Promise.resolve();
    });
    await settle(current);

    expect(cursorLine(current)).toContain("Eight lines.");
  });

  test("/ opens the search bar in the panel", async () => {
    const current = await setup([user, reply]);

    await press(current, "/");
    await settle(current);

    expect(current.captureCharFrame()).toMatch(/^\s*\/\s*$/mu);
  });

  test("in a panel group, Tab still switches panels and history keys stay in the panel", async () => {
    const current = await setup([user, reply], true);

    await press(current, "k");
    expect(cursorLine(current)).toContain('ls {"path":"."} · done');

    await pressTab(current);
    expect(current.captureCharFrame()).toContain("active:input");

    await press(current, "j");
    expect(cursorLine(current)).toContain('ls {"path":"."} · done');
  });
});
