/** Status bar content: current model, thinking level, and session phase. */

import type { StatusBarItem } from "@tooee/layout";

import type { ChatState } from "./chat-state.js";

const PHASE_LABEL: Record<ChatState["phase"], string> = {
  booting: "starting",
  failed: "unavailable",
  ready: "ready",
  streaming: "streaming",
};

export const statusItems = function statusItems(state: ChatState): StatusBarItem[] {
  return [
    { label: "model", value: state.modelLabel ?? "none" },
    { label: "thinking", value: state.thinkingLevel ?? "off" },
    { label: "pi", value: PHASE_LABEL[state.phase] },
  ];
};
