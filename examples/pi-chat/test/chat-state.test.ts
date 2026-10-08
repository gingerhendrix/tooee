import { describe, expect, test } from "bun:test";

import { chatReducer, initialChatState } from "../chat-state.js";
import type { ChatAction, ChatState } from "../chat-state.js";

const run = function run(...actions: ChatAction[]): ChatState {
  let state = initialChatState;

  for (const action of actions) {
    state = chatReducer(state, action);
  }

  return state;
};

const booted: ChatAction = { modelLabel: "openrouter/flash", type: "booted" };

describe("chatReducer", () => {
  test("boot moves to ready with the model label", () => {
    const state = run(booted);

    expect(state.phase).toBe("ready");
    expect(state.modelLabel).toBe("openrouter/flash");
  });

  test("boot failure keeps the message for the history panel", () => {
    const state = run({ message: "No Pi models are available.", type: "bootFailed" });

    expect(state.phase).toBe("failed");
    expect(state.failure).toBe("No Pi models are available.");
  });

  test("text deltas stream into one assistant turn tagged with the model", () => {
    const state = run(
      booted,
      { text: "hi", type: "userSent" },
      { type: "assistantStarted" },
      { delta: "Hel", type: "textDelta" },
      { delta: "lo", type: "textDelta" }
    );

    expect(state.phase).toBe("streaming");
    expect(state.turns.map((turn) => turn.role)).toEqual(["user", "assistant"]);
    expect(state.turns[1]).toMatchObject({
      model: "openrouter/flash",
      streaming: true,
      text: "Hello",
    });
  });

  test("message end keeps the final text and settle returns to ready", () => {
    const state = run(
      booted,
      { text: "hi", type: "userSent" },
      { type: "assistantStarted" },
      { delta: "Hel", type: "textDelta" },
      { stopReason: "stop", text: "Hello!", type: "assistantEnded" },
      { type: "runSettled" }
    );

    expect(state.phase).toBe("ready");
    expect(state.turns[1]).toMatchObject({ streaming: false, text: "Hello!" });
  });

  test("an error stop reason adds an error turn", () => {
    const state = run(
      booted,
      { text: "hi", type: "userSent" },
      { type: "assistantStarted" },
      { errorMessage: "401 Unauthorized", stopReason: "error", text: "", type: "assistantEnded" }
    );

    expect(state.turns.at(-1)).toMatchObject({ role: "error", text: "401 Unauthorized" });
  });

  test("an aborted run marks the assistant turn", () => {
    const state = run(
      booted,
      { text: "hi", type: "userSent" },
      { type: "assistantStarted" },
      { stopReason: "aborted", text: "", type: "assistantEnded" }
    );

    expect(state.turns[1]).toMatchObject({ aborted: true, streaming: false });
  });

  test("a failed prompt closes open turns and returns to ready", () => {
    const state = run(
      booted,
      { text: "hi", type: "userSent" },
      { type: "assistantStarted" },
      { message: "No API key", type: "runFailed" }
    );

    expect(state.phase).toBe("ready");
    expect(state.turns[1]?.streaming).toBe(false);
    expect(state.turns.at(-1)).toMatchObject({ role: "error", text: "No API key" });
  });
});
