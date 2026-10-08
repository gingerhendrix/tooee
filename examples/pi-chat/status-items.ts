/** Status bar content: current model, session phase, and key hints. */

import type { StatusBarItem } from "@tooee/layout";

import type { ChatState } from "./chat-state.js";
import { SELECT_MODEL_HOTKEY } from "./use-chat-commands.js";

const PHASE_LABEL: Record<ChatState["phase"], string> = {
  booting: "starting",
  failed: "unavailable",
  ready: "ready",
  streaming: "streaming",
};

export const statusItems = function statusItems(state: ChatState): StatusBarItem[] {
  return [
    { label: "model", value: state.modelLabel ?? "none" },
    { label: "pi", value: PHASE_LABEL[state.phase] },
    { label: "keys", value: `${SELECT_MODEL_HOTKEY} model · : palette · Esc then q quit` },
  ];
};
