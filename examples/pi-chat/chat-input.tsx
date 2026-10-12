/**
 * Input panel body: the @tooee/ask multiline editor. Enter starts a new line
 * and shift+Enter sends. In cursor mode (Esc), Enter also sends. The buffer
 * clears when the session takes the prompt. `@path` words attach text files
 * and images, and `@` then Tab opens a file chooser. While a reply streams, a
 * send keeps the text and shows a toast instead.
 */

import { AskEditor, useAskEditor } from "@tooee/ask";
import { useTheme } from "@tooee/themes";
import { useToast } from "@tooee/toasts";
import type { ReactNode } from "react";

import type { ChatPhase } from "./chat-state.js";
import { useAttachCommand } from "./use-attach-command.js";
import { ABORT_HOTKEY, useChatCommands } from "./use-chat-commands.js";
import type { PiChat } from "./use-pi-chat.js";

const PLACEHOLDER: Record<ChatPhase, string> = {
  booting: "Starting Pi session…",
  failed: "Pi is not available",
  ready: "Ask something… (@ then Tab attaches a file)",
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
    multiline: true,
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

  useAttachCommand(controller, editor);

  const handleMouseDown = editor.onMouseDown;

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={handleMouseDown}
    >
      <AskEditor editor={editor} />
      <text
        content={`shift+Enter send · Enter new line · ${ABORT_HOTKEY} abort · Esc : commands`}
        fg={theme.textMuted}
      />
    </box>
  );
};
