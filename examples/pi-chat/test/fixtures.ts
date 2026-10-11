/** Pi message fixtures shared by the pi-chat tests. */

import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";

type AgentMessage = Extract<AgentSessionEvent, { type: "message_end" }>["message"];

type AssistantMessage = Extract<AgentMessage, { role: "assistant" }>;

type ToolResultMessage = Extract<AgentMessage, { role: "toolResult" }>;

const usage = {
  cacheRead: 0,
  cacheWrite: 0,
  cost: { cacheRead: 0, cacheWrite: 0, input: 0, output: 0, total: 0 },
  input: 0,
  output: 0,
  totalTokens: 0,
};

// 1x1 PNG, 70 bytes decoded.
export const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export const assistant = function assistant(
  content: AssistantMessage["content"],
  stopReason: AssistantMessage["stopReason"] = "stop"
): AssistantMessage {
  return {
    api: "openai-responses",
    content,
    model: "test",
    provider: "openai",
    role: "assistant",
    stopReason,
    timestamp: 0,
    usage,
  };
};

export const toolResult: ToolResultMessage = {
  content: [
    { text: "line 1\nline 2", type: "text" },
    { data: PNG_BASE64, mimeType: "image/png", type: "image" },
  ],
  isError: false,
  role: "toolResult",
  timestamp: 0,
  toolCallId: "call-1",
  toolName: "read",
};

export const mixed = assistant(
  [
    { thinking: "Look at the file", type: "thinking" },
    { thinking: "", thinkingSignature: "signature-only", type: "thinking" },
    { redacted: true, thinking: "", thinkingSignature: "opaque", type: "thinking" },
    { text: "", type: "text" },
    { text: "Reading it.", type: "text" },
    { arguments: { path: "a.png" }, id: "call-1", name: "read", type: "toolCall" },
  ],
  "toolUse"
);
