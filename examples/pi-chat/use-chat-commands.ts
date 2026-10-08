/**
 * Chat commands (model selector, abort). Root commands do not fire while the
 * input panel is in insert mode, so the app calls this hook at the root and
 * again inside the input panel. The panel copy shadows the root copy while
 * the input panel is active.
 */

import { useCommand } from "@tooee/commands";

import { useModelPicker } from "./use-model-picker.js";
import type { PiChat } from "./use-pi-chat.js";

export const SELECT_MODEL_HOTKEY = "ctrl+o";

export const ABORT_HOTKEY = "ctrl+x";

export const useChatCommands = function useChatCommands(chat: PiChat): void {
  const openModelPicker = useModelPicker(chat);
  const { phase } = chat.state;

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
};
