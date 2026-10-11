/**
 * Input panel body: the @tooee/ask single-line editor. Enter submits; the
 * buffer clears when the session takes the prompt. `@path.png` words attach
 * images. While a reply streams,
 * Enter keeps the text and shows a toast instead.
 */

import { AskEditor, useAskEditor } from "@tooee/ask";
import { useTheme } from "@tooee/themes";
import { useToast } from "@tooee/toasts";
import type { ReactNode } from "react";

import type { ChatPhase } from "./chat-state.js";
import { ABORT_HOTKEY, DETAILS_HOTKEY, useChatCommands } from "./use-chat-commands.js";
import type { PiChat } from "./use-pi-chat.js";

const PLACEHOLDER: Record<ChatPhase, string> = {
  booting: "Starting Pi session…",
  failed: "Pi is not available",
  ready: "Ask something… (@file.png attaches an image)",
  streaming: `Waiting for the reply (${ABORT_HOTKEY} aborts)…`,
};

export const ChatInput = function ChatInput({ chat }: { chat: PiChat }): ReactNode {
  const { theme } = useTheme();
  const toast = useToast();
  // The input panel stays in insert mode, so root commands cannot reach it.
  useChatCommands(chat);

  const { controller, editor } = useAskEditor({
    commandScope: "chat-input",
    disable: ["cancel"],
    onSubmit: (value) => {
      const text = value.trim();

      if (text === "") {
        return;
      }

      if (chat.send(text)) {
        controller.setText("");

        return;
      }

      const message =
        chat.state.phase === "streaming"
          ? "Wait for the reply, or abort it first."
          : "The Pi session is not ready.";

      toast.toast({ level: "warning", message });
    },
    placeholder: PLACEHOLDER[chat.state.phase],
  });

  const handleMouseDown = editor.onMouseDown;

  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1} onMouseDown={handleMouseDown}>
      <AskEditor editor={editor} />
      <text
        content={`Enter send · ${ABORT_HOTKEY} abort · ${DETAILS_HOTKEY} details · Esc commands · Tab panel`}
        fg={theme.textMuted}
      />
    </box>
  );
};
