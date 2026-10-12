/**
 * Chat actions (model selector, abort, thinking level, details) under the
 * "Chat" group in the palette and which-key. Root commands do not fire while
 * the input panel is in insert mode, so the app calls this hook at the root
 * and again inside the input panel. The panel copy shadows the root copy
 * while the input panel is active.
 */

import { useActions } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import { useToast } from "@tooee/toasts";

import { useModelPicker } from "./use-model-picker.js";
import type { PiChat } from "./use-pi-chat.js";

export const ABORT_HOTKEY = "ctrl+x";

export const DETAILS_HOTKEY = "ctrl+e";

const GROUP = "Chat";

const MODES: ActionDefinition["modes"] = ["cursor", "insert"];

export const useChatCommands = function useChatCommands(chat: PiChat): void {
  const openModelPicker = useModelPicker(chat);
  const toast = useToast();
  const { phase } = chat.state;

  const cycleThinking = (): void => {
    if (chat.cycleThinking() === undefined) {
      toast.toast({ level: "info", message: "This model has no thinking levels." });
    }
  };

  const actions: ActionDefinition[] = [
    {
      group: GROUP,
      handler: openModelPicker,
      hotkey: "ctrl+o",
      id: "pi.select-model",
      modes: MODES,
      title: "Select model",
      when: () => phase === "ready" || phase === "streaming",
    },
    {
      group: GROUP,
      handler: chat.abort,
      hotkey: ABORT_HOTKEY,
      id: "pi.abort",
      modes: MODES,
      title: "Abort response",
      when: () => phase === "streaming",
    },
    {
      group: GROUP,
      handler: cycleThinking,
      hotkey: "ctrl+t",
      id: "pi.cycle-thinking",
      modes: MODES,
      title: "Cycle thinking level",
      when: () => phase === "ready",
    },
    {
      group: GROUP,
      handler: chat.toggleDetails,
      hotkey: DETAILS_HOTKEY,
      id: "pi.toggle-details",
      modes: MODES,
      title: "Show or hide all thinking and tool output",
    },
  ];

  useActions(actions);
};
