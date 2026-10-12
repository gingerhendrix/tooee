/**
 * Root of the Pi chat demo: AppLayout with a history panel above an input
 * panel. Owns the Pi session (usePiChat) and the root-level commands.
 */

import { AppLayout } from "@tooee/layout";
import { Panel, PanelGroup } from "@tooee/panels";
import { useQuitCommand, useThemeCommands } from "@tooee/shell";
import type { ReactNode } from "react";

import { ChatInput } from "./chat-input.js";
import { MessageHistory } from "./message-history.js";
import { statusItems } from "./status-items.js";
import { useChatCommands } from "./use-chat-commands.js";
import { usePiChat } from "./use-pi-chat.js";

/** Two border rows, five editor rows, and one hint row. */
const INPUT_PANEL_HEIGHT = 8;

export const PiChatApp = function PiChatApp(): ReactNode {
  const chat = usePiChat();

  // Quit destroys the renderer, which unmounts the tree; usePiChat disposes
  // the session in its effect cleanup.
  useQuitCommand();
  useThemeCommands();
  // Root copy: reachable from the history panel and from input cursor mode.
  useChatCommands(chat);

  return (
    <AppLayout titleBar={{ title: "Pi chat" }} statusBar={{ items: statusItems(chat.state) }}>
      <box flexDirection="column" width="100%" height="100%">
        <PanelGroup defaultActivePanelId="input">
          <Panel id="history" title="Messages" style={{ flexGrow: 1 }}>
            <MessageHistory state={chat.state} />
          </Panel>
          <Panel
            id="input"
            title="Input"
            initialMode="insert"
            style={{ height: INPUT_PANEL_HEIGHT }}
          >
            <ChatInput chat={chat} />
          </Panel>
        </PanelGroup>
      </box>
    </AppLayout>
  );
};
