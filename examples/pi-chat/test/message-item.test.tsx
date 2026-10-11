import { afterEach, describe, expect, test } from "bun:test";

import { testRender } from "@tooee/test-support";
import { ThemeSwitcherProvider } from "@tooee/themes";

import type { ChatTurn } from "../chat-state.js";
import { MessageItem } from "../message-item.js";

const RENDER_PASSES = 10;

let testSetup: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  testSetup?.renderer.destroy();
  testSetup = undefined;
});

const renderTurn = async function renderTurn(turn: ChatTurn, showDetails = false): Promise<string> {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MessageItem turn={turn} showDetails={showDetails} />
    </ThemeSwitcherProvider>,
    { height: 30, width: 90 }
  );

  // The <markdown> element fills in on a later frame, so render a few times.
  for (let pass = 0; pass < RENDER_PASSES; pass += 1) {
    // oxlint-disable-next-line no-await-in-loop -- each frame must finish before the next
    await testSetup.renderOnce();
    // oxlint-disable-next-line no-await-in-loop -- give the markdown parser time between frames
    await Bun.sleep(20);
  }

  return testSetup.captureCharFrame();
};

const longOutput = Array.from({ length: 8 }, (_, index) => `line ${index + 1}`).join("\n");

const assistantTurn: ChatTurn = {
  aborted: false,
  id: 2,
  model: "openrouter/flash",
  parts: [
    { kind: "thinking", redacted: false, text: "Check the folder first." },
    {
      args: '{"path":"."}',
      id: "call-1",
      kind: "toolCall",
      name: "ls",
      result: { images: [], isError: false, text: longOutput },
      status: "done",
    },
    {
      args: '{"path":"dot.png"}',
      id: "call-2",
      kind: "toolCall",
      name: "read",
      result: {
        images: [{ bytes: 70, kind: "image", mimeType: "image/png" }],
        isError: false,
        text: "Read image file [image/png]",
      },
      status: "done",
    },
    { args: "{}", id: "call-3", kind: "toolCall", name: "grep", status: "cancelled" },
    { kind: "text", text: "The image is blue." },
  ],
  role: "assistant",
  streaming: false,
};

describe("MessageItem", () => {
  test("shows thinking, tool calls with status and results, image chips, and text", async () => {
    const frame = await renderTurn(assistantTurn);

    expect(frame).toContain("openrouter/flash");
    expect(frame).toContain("Thinking");
    expect(frame).toContain("Check the folder first.");
    expect(frame).toContain('ls {"path":"."} · done');
    expect(frame).toContain("line 4");
    expect(frame).not.toContain("line 5");
    expect(frame).toContain("… 4 more lines (ctrl+e shows all)");
    expect(frame).toContain("[image png · 70 B]");
    expect(frame).toContain("grep · not run");
    expect(frame).toContain("The image is blue.");
  });

  test("details mode shows the whole tool output", async () => {
    const frame = await renderTurn(assistantTurn, true);

    expect(frame).toContain("line 8");
    expect(frame).not.toContain("more lines");
  });

  test("a user turn shows its text and its attached images", async () => {
    const frame = await renderTurn({
      aborted: false,
      id: 1,
      parts: [
        { kind: "text", text: "what is @dot.png" },
        { bytes: 2048, kind: "image", mimeType: "image/png" },
      ],
      role: "user",
      streaming: false,
    });

    expect(frame).toContain("You");
    expect(frame).toContain("what is @dot.png");
    expect(frame).toContain("[image png · 2.0 KB]");
  });
});
