/**
 * Maps Pi SDK session events onto chat actions. Assistant messages become
 * display parts (text, thinking, tool calls). Tool events set the status and
 * result of their tool call. Thinking level changes (from a cycle or a model
 * switch) update the status bar. Events the demo does not show (compaction,
 * queue updates) map to `undefined`.
 */

import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";

import type { ChatAction } from "./chat-state.js";
import { assistantParts, toolResultView } from "./content-parts.js";

type MessageEvent = Extract<AgentSessionEvent, { type: "message_end" }>;

type AgentMessage = MessageEvent["message"];

const isAssistant = function isAssistant(message: AgentMessage): boolean {
  return "role" in message && message.role === "assistant";
};

const endAction = function endAction(message: AgentMessage): ChatAction | undefined {
  if (!("role" in message)) {
    return undefined;
  }

  if (message.role === "toolResult") {
    return {
      result: toolResultView(message),
      toolCallId: message.toolCallId,
      type: "toolFinished",
    };
  }

  if (message.role !== "assistant") {
    return undefined;
  }

  return {
    errorMessage: message.errorMessage,
    parts: assistantParts(message),
    stopReason: message.stopReason,
    type: "assistantEnded",
  };
};

export const toChatAction = function toChatAction(
  event: AgentSessionEvent
): ChatAction | undefined {
  if (event.type === "message_start") {
    return isAssistant(event.message) ? { type: "assistantStarted" } : undefined;
  }

  if (event.type === "message_update") {
    // The update carries the whole partial message, so rebuild all parts.
    return isAssistant(event.message)
      ? { parts: assistantParts(event.message), type: "assistantUpdated" }
      : undefined;
  }

  if (event.type === "message_end") {
    return endAction(event.message);
  }

  if (event.type === "tool_execution_start") {
    return { toolCallId: event.toolCallId, type: "toolStarted" };
  }

  if (event.type === "thinking_level_changed") {
    return { thinkingLevel: event.level, type: "thinkingLevelChanged" };
  }

  return event.type === "agent_settled" ? { type: "runSettled" } : undefined;
};
