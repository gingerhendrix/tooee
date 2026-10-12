/**
 * Status bar content: current model, thinking level, and session phase.
 *
 * The bar is always one row. On a narrow terminal the thinking item switches
 * to a short label and then hides, and the model id shortens in the middle.
 * The session phase stays at the right edge at every width.
 */

import { StatusPriority } from "@tooee/layout";
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
    {
      compact: { label: "" },
      id: "model",
      label: "Model:",
      minValueWidth: 12,
      priority: StatusPriority.position,
      truncate: "middle",
      value: state.modelLabel ?? "none",
    },
    {
      compact: { label: "Think:" },
      id: "thinking",
      label: "Thinking:",
      priority: StatusPriority.focus,
      value: state.thinkingLevel ?? "off",
    },
    {
      align: "end",
      id: "phase",
      label: "Pi:",
      priority: StatusPriority.critical,
      value: PHASE_LABEL[state.phase],
    },
  ];
};
