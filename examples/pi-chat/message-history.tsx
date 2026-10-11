/**
 * Message history panel body: a bottom-sticky scrollbox of chat turns, or a
 * status message while the session boots or after it fails. j/k and
 * ctrl+d/ctrl+u scroll while this panel is active.
 */

import type { ScrollBoxRenderable } from "@opentui/core";
import { useCommand } from "@tooee/commands";
import { useTheme } from "@tooee/themes";
import { useRef } from "react";
import type { ReactNode } from "react";

import type { ChatState } from "./chat-state.js";
import { MessageItem } from "./message-item.js";

const PAGE = 10;

const useScrollCommands = function useScrollCommands(ref: {
  current: ScrollBoxRenderable | null;
}): void {
  const scroll = (delta: number) => () => {
    ref.current?.scrollBy(delta);
  };

  useCommand({ handler: scroll(1), hotkey: "j", id: "history.down", title: "Scroll down" });
  useCommand({ handler: scroll(-1), hotkey: "k", id: "history.up", title: "Scroll up" });
  useCommand({
    handler: scroll(PAGE),
    hotkey: "ctrl+d",
    id: "history.page-down",
    title: "Page down",
  });
  useCommand({ handler: scroll(-PAGE), hotkey: "ctrl+u", id: "history.page-up", title: "Page up" });
};

const EmptyState = function EmptyState({ state }: { state: ChatState }): ReactNode {
  const { theme } = useTheme();

  if (state.phase === "failed") {
    return (
      <box flexDirection="column">
        <text fg={theme.error}>
          <strong>Pi is not available</strong>
        </text>
        <text content={state.failure ?? "Unknown error"} fg={theme.text} />
      </box>
    );
  }

  const message =
    state.phase === "booting"
      ? "Starting Pi session…"
      : "No messages yet. Type in the input panel and press Enter.";

  return <text content={message} fg={theme.textMuted} />;
};

export const MessageHistory = function MessageHistory({ state }: { state: ChatState }): ReactNode {
  const scrollRef = useRef<ScrollBoxRenderable>(null);
  useScrollCommands(scrollRef);

  return (
    <scrollbox
      ref={scrollRef}
      stickyScroll
      stickyStart="bottom"
      focused={false}
      style={{ flexGrow: 1, paddingLeft: 1, paddingRight: 1 }}
    >
      {state.turns.length === 0 ? (
        <EmptyState state={state} />
      ) : (
        state.turns.map((turn): ReactNode => (
          <MessageItem key={turn.id} turn={turn} showDetails={state.showDetails} />
        ))
      )}
    </scrollbox>
  );
};
