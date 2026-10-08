/**
 * One chat turn: a role label line, then the text. Assistant text renders
 * with the OpenTUI `<markdown>` element in streaming mode; user and error
 * text render plain. (Tooee's MarkdownView is a scrolling document, so it
 * cannot stack inside the history scrollbox.)
 */

import { useTheme } from "@tooee/themes";
import type { ReactNode } from "react";

import type { ChatTurn, ChatTurnRole } from "./chat-state.js";

const assistantSuffix = function assistantSuffix(turn: ChatTurn): string {
  if (turn.streaming) {
    return " …";
  }

  return turn.aborted ? " (aborted)" : "";
};

const ROLE_LABEL: Record<ChatTurnRole, string> = {
  assistant: "Assistant",
  error: "Error",
  user: "You",
};

const ROLE_COLOR: Record<ChatTurnRole, "accent" | "error" | "primary"> = {
  assistant: "accent",
  error: "error",
  user: "primary",
};

const turnLabel = function turnLabel(turn: ChatTurn): string {
  if (turn.role !== "assistant") {
    return ROLE_LABEL[turn.role];
  }

  return `${turn.model ?? ROLE_LABEL.assistant}${assistantSuffix(turn)}`;
};

export const MessageItem = function MessageItem({ turn }: { turn: ChatTurn }): ReactNode {
  const { syntax, theme } = useTheme();
  const showMarkdown = turn.role === "assistant" && turn.text !== "";

  return (
    <box flexDirection="column" marginBottom={1}>
      <text fg={theme[ROLE_COLOR[turn.role]]}>
        <strong>{turnLabel(turn)}</strong>
      </text>
      {showMarkdown ? (
        <markdown content={turn.text} syntaxStyle={syntax} streaming={turn.streaming} />
      ) : (
        <text content={turn.text} fg={turn.role === "error" ? theme.error : theme.text} />
      )}
    </box>
  );
};
