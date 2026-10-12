import { afterEach, expect, test } from "bun:test";

import { Panel, PanelGroup } from "@tooee/panels";
import { TooeeProvider } from "@tooee/shell";
import { pressEnter, testRender } from "@tooee/test-support";
import type { TestSession } from "@tooee/test-support";
import { act } from "react";
import type { ReactNode } from "react";

import { ChatInput } from "../chat-input.js";
import { initialChatState } from "../chat-state.js";
import type { PiChat } from "../use-pi-chat.js";

let session: TestSession | undefined;

let sent: string[] = [];

const fakeChat: PiChat = {
  abort: () => {},
  cycleThinking: () => {},
  listModels: async () => await Promise.resolve([]),
  selectModel: async () => {},
  send: (text) => {
    sent.push(text);

    return true;
  },
  state: { ...initialChatState, phase: "ready" },
  toggleDetails: () => {},
};

/** The demo's input panel: insert mode, eight rows high. */
const Harness = function Harness(): ReactNode {
  return (
    <box flexDirection="column" width="100%" height="100%">
      <PanelGroup defaultActivePanelId="input">
        <Panel id="input" title="Input" initialMode="insert" style={{ height: 8 }}>
          <ChatInput chat={fakeChat} />
        </Panel>
      </PanelGroup>
    </box>
  );
};

const typeText = async function typeText(current: TestSession, text: string): Promise<void> {
  await act(async () => {
    await current.mockInput.typeText(text);
  });
  await current.renderOnce();
};

const setup = async function setup(): Promise<TestSession> {
  sent = [];
  session = await testRender(
    <TooeeProvider>
      <Harness />
    </TooeeProvider>,
    { height: 10, kittyKeyboard: true, width: 80 }
  );
  await session.renderOnce();

  return session;
};

afterEach(() => {
  session?.renderer.destroy();
  session = undefined;
});

test("Enter starts a new line and shift+Enter sends the whole prompt", async () => {
  const current = await setup();

  await typeText(current, "first");
  await pressEnter(current);
  await typeText(current, "second");

  expect(sent).toEqual([]);
  const frame = current.captureCharFrame();
  expect(frame).toContain("first");
  expect(frame).toContain("second");

  await act(async () => {
    current.mockInput.pressEnter({ shift: true });
    await Promise.resolve();
  });
  await current.renderOnce();

  expect(sent).toEqual(["first\nsecond"]);
  expect(current.captureCharFrame()).not.toContain("second");
});

test("the hint line names the send and new-line keys", async () => {
  const current = await setup();

  expect(current.captureCharFrame()).toContain("shift+Enter send · Enter new line");
});
