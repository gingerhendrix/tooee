import { describe, expect, test } from "bun:test";

import { chatReducer, initialChatState } from "../chat-state.js";
import type { ChatAction, ChatState } from "../chat-state.js";
import type { TurnPart } from "../content-parts.js";

const run = function run(...actions: ChatAction[]): ChatState {
  let state = initialChatState;

  for (const action of actions) {
    state = chatReducer(state, action);
  }

  return state;
};

const text = function text(value: string): TurnPart[] {
  return [{ kind: "text", text: value }];
};

const booted: ChatAction = {
  modelLabel: "openrouter/flash",
  thinkingLevel: "off",
  type: "booted",
};

const sent: ChatAction = { parts: text("hi"), type: "userSent" };

const readCall: TurnPart = {
  args: '{"path":"a.ts"}',
  id: "call-1",
  kind: "toolCall",
  name: "read",
  status: "pending",
};

describe("chatReducer", () => {
  test("boot moves to ready with the model label and thinking level", () => {
    const state = run(booted);

    expect(state.phase).toBe("ready");
    expect(state.modelLabel).toBe("openrouter/flash");
    expect(state.thinkingLevel).toBe("off");
  });

  test("boot failure keeps the message for the history panel", () => {
    const state = run({ message: "No Pi models are available.", type: "bootFailed" });

    expect(state.phase).toBe("failed");
    expect(state.failure).toBe("No Pi models are available.");
  });

  test("updates replace the parts of one assistant turn tagged with the model", () => {
    const thinking: TurnPart = { kind: "thinking", redacted: false, text: "Plan" };

    const state = run(
      booted,
      sent,
      { type: "assistantStarted" },
      { parts: [thinking], type: "assistantUpdated" },
      { parts: [thinking, ...text("Hello")], type: "assistantUpdated" }
    );

    expect(state.phase).toBe("streaming");
    expect(state.turns.map((turn) => turn.role)).toEqual(["user", "assistant"]);
    expect(state.turns[1]).toMatchObject({
      model: "openrouter/flash",
      parts: [thinking, { kind: "text", text: "Hello" }],
      streaming: true,
    });
  });

  test("message end keeps the final parts and settle returns to ready", () => {
    const state = run(
      booted,
      sent,
      { type: "assistantStarted" },
      { parts: text("Hel"), type: "assistantUpdated" },
      { parts: text("Hello!"), stopReason: "stop", type: "assistantEnded" },
      { type: "runSettled" }
    );

    expect(state.phase).toBe("ready");
    expect(state.turns[1]).toMatchObject({ parts: text("Hello!"), streaming: false });
  });

  test("an error stop reason adds an error turn", () => {
    const state = run(
      booted,
      sent,
      { type: "assistantStarted" },
      {
        errorMessage: "401 Unauthorized",
        parts: [],
        stopReason: "error",
        type: "assistantEnded",
      }
    );

    expect(state.turns.at(-1)).toMatchObject({ parts: text("401 Unauthorized"), role: "error" });
  });

  test("an aborted run marks the assistant turn", () => {
    const state = run(
      booted,
      sent,
      { type: "assistantStarted" },
      {
        parts: [],
        stopReason: "aborted",
        type: "assistantEnded",
      }
    );

    expect(state.turns[1]).toMatchObject({ aborted: true, streaming: false });
  });

  test("a failed prompt closes open turns and returns to ready", () => {
    const state = run(
      booted,
      sent,
      { type: "assistantStarted" },
      { message: "No API key", type: "runFailed" }
    );

    expect(state.phase).toBe("ready");
    expect(state.turns[1]?.streaming).toBe(false);
    expect(state.turns.at(-1)).toMatchObject({ parts: text("No API key"), role: "error" });
  });

  test("attached images follow the text of the newest user turn", () => {
    const image: TurnPart = {
      bytes: 2048,
      data: new Uint8Array(),
      kind: "image",
      mimeType: "image/png",
    };

    const state = run(booted, sent, { images: [image], type: "imagesAttached" });

    expect(state.turns[0]?.parts).toEqual([...text("hi"), image]);
  });

  test("tool events set the status and result of their call", () => {
    const started = run(
      booted,
      sent,
      { type: "assistantStarted" },
      { parts: [readCall], stopReason: "toolUse", type: "assistantEnded" },
      { toolCallId: "call-1", type: "toolStarted" }
    );

    expect(started.turns[1]?.parts[0]).toMatchObject({ status: "running" });

    const result = { images: [], isError: false, text: "file body" };
    const finished = chatReducer(started, { result, toolCallId: "call-1", type: "toolFinished" });

    expect(finished.turns[1]?.parts[0]).toMatchObject({ result, status: "done" });
  });

  test("a failed tool result marks the call as an error", () => {
    const state = run(
      booted,
      sent,
      { type: "assistantStarted" },
      { parts: [readCall], stopReason: "toolUse", type: "assistantEnded" },
      {
        result: { images: [], isError: true, text: "ENOENT" },
        toolCallId: "call-1",
        type: "toolFinished",
      }
    );

    expect(state.turns[1]?.parts[0]).toMatchObject({ status: "error" });
  });

  test("rebuilt parts keep the tool progress of the same call id", () => {
    const state = run(
      booted,
      sent,
      { type: "assistantStarted" },
      { parts: [readCall], type: "assistantUpdated" },
      { toolCallId: "call-1", type: "toolStarted" },
      { parts: [readCall, ...text("Reading")], type: "assistantUpdated" }
    );

    expect(state.turns[1]?.parts[0]).toMatchObject({ status: "running" });
  });

  test("settling cancels tool calls that never finished", () => {
    const state = run(
      booted,
      sent,
      { type: "assistantStarted" },
      { parts: [readCall], stopReason: "aborted", type: "assistantEnded" },
      { type: "runSettled" }
    );

    expect(state.turns[1]?.parts[0]).toMatchObject({ status: "cancelled" });
  });

  test("model and thinking level changes update the status values", () => {
    const state = run(
      booted,
      { modelLabel: "anthropic/opus", type: "modelChanged" },
      { thinkingLevel: "high", type: "thinkingLevelChanged" }
    );

    expect(state).toMatchObject({ modelLabel: "anthropic/opus", thinkingLevel: "high" });
  });

  test("the details toggle flips", () => {
    expect(run({ type: "detailsToggled" }).showDetails).toBe(true);
    expect(run({ type: "detailsToggled" }, { type: "detailsToggled" }).showDetails).toBe(false);
  });
});
