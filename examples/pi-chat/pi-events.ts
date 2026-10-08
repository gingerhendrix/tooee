/**
 * Maps Pi SDK session events onto chat actions. Events the demo does not
 * show (tool calls, compaction, queue updates) map to `undefined`.
 */

import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";

import type { ChatAction } from "./chat-state.js";

type MessageEvent = Extract<AgentSessionEvent, { type: "message_end" }>;

type AgentMessage = MessageEvent["message"];

const isAssistant = function isAssistant(message: AgentMessage): boolean {
  return "role" in message && message.role === "assistant";
};

/** Joins the text parts of an assistant message (thinking and tool calls are skipped). */
export const assistantText = function assistantText(message: AgentMessage): string {
  if (!("role" in message) || message.role !== "assistant") {
    return "";
  }

  return message.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");
};

const endAction = function endAction(message: AgentMessage): ChatAction {
  if (!("role" in message) || message.role !== "assistant") {
    return { text: "", type: "assistantEnded" };
  }

  return {
    errorMessage: message.errorMessage,
    stopReason: message.stopReason,
    text: assistantText(message),
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
    const update = event.assistantMessageEvent;

    return update.type === "text_delta" ? { delta: update.delta, type: "textDelta" } : undefined;
  }

  if (event.type === "message_end") {
    return isAssistant(event.message) ? endAction(event.message) : undefined;
  }

  return event.type === "agent_settled" ? { type: "runSettled" } : undefined;
};
