/**
 * Chat commands (model selector, abort, thinking level, details). Root commands do not fire while the
 * input panel is in insert mode, so the app calls this hook at the root and
 * again inside the input panel. The panel copy shadows the root copy while
 * the input panel is active.
 */

import { useCommand } from "@tooee/commands";
import { useToast } from "@tooee/toasts";

import { useModelPicker } from "./use-model-picker.js";
import type { PiChat } from "./use-pi-chat.js";

export const SELECT_MODEL_HOTKEY = "ctrl+o";

export const ABORT_HOTKEY = "ctrl+x";

export const THINKING_HOTKEY = "ctrl+t";

export const DETAILS_HOTKEY = "ctrl+e";

export const useChatCommands = function useChatCommands(chat: PiChat): void {
  const openModelPicker = useModelPicker(chat);
  const toast = useToast();
  const { phase } = chat.state;

  const cycleThinking = (): void => {
    if (chat.cycleThinking() === undefined) {
      toast.toast({ level: "info", message: "This model has no thinking levels." });
    }
  };

  useCommand({
    handler: openModelPicker,
    hotkey: SELECT_MODEL_HOTKEY,
    id: "pi.select-model",
    modes: ["cursor", "insert"],
    title: "Select model",
    when: () => phase === "ready" || phase === "streaming",
  });

  useCommand({
    handler: chat.abort,
    hotkey: ABORT_HOTKEY,
    id: "pi.abort",
    modes: ["cursor", "insert"],
    title: "Abort response",
    when: () => phase === "streaming",
  });

  useCommand({
    handler: cycleThinking,
    hotkey: THINKING_HOTKEY,
    id: "pi.cycle-thinking",
    modes: ["cursor", "insert"],
    title: "Cycle thinking level",
    when: () => phase === "ready",
  });

  useCommand({
    handler: chat.toggleDetails,
    hotkey: DETAILS_HOTKEY,
    id: "pi.toggle-details",
    modes: ["cursor", "insert"],
    title: "Show or hide thinking and tool output",
  });
};
