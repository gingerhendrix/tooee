import { describe, expect, test } from "bun:test";

import { toChatAction } from "../pi-events.js";
import { mixed, toolResult } from "./fixtures.js";

describe("toChatAction", () => {
  test("assistant updates rebuild the parts from the partial message", () => {
    const action = toChatAction({
      assistantMessageEvent: {
        contentIndex: 0,
        delta: "Look",
        partial: mixed,
        type: "thinking_delta",
      },
      message: mixed,
      type: "message_update",
    });

    expect(action).toMatchObject({ type: "assistantUpdated" });
    expect(action?.type === "assistantUpdated" ? action.parts : []).toHaveLength(4);
  });

  test("assistant end carries parts and the stop reason", () => {
    expect(toChatAction({ message: mixed, type: "message_end" })).toMatchObject({
      stopReason: "toolUse",
      type: "assistantEnded",
    });
  });

  test("tool execution start marks the call as running", () => {
    expect(
      toChatAction({
        args: { path: "a.png" },
        toolCallId: "call-1",
        toolName: "read",
        type: "tool_execution_start",
      })
    ).toEqual({ toolCallId: "call-1", type: "toolStarted" });
  });

  test("a tool result message finishes the call with its text and images", () => {
    expect(toChatAction({ message: toolResult, type: "message_end" })).toEqual({
      result: {
        images: [{ bytes: 70, kind: "image", mimeType: "image/png" }],
        isError: false,
        text: "line 1\nline 2",
      },
      toolCallId: "call-1",
      type: "toolFinished",
    });
  });

  test("a thinking level change maps to the status action", () => {
    expect(toChatAction({ level: "high", type: "thinking_level_changed" })).toEqual({
      thinkingLevel: "high",
      type: "thinkingLevelChanged",
    });
  });

  test("tool result starts and user messages have no action", () => {
    expect(toChatAction({ message: toolResult, type: "message_start" })).toBeUndefined();
    expect(
      toChatAction({
        message: { content: "hi", role: "user", timestamp: 0 },
        type: "message_end",
      })
    ).toBeUndefined();
  });
});
