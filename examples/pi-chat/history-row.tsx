/**
 * One row of the history document: a turn header (the role label line), or
 * one part of a turn. Assistant text renders with the OpenTUI `<markdown>`
 * element in streaming mode; user and error text render plain. Thinking,
 * tool calls, and images use the views in turn-parts.tsx. (Tooee's
 * MarkdownView is a scrolling document, so it cannot sit inside a row.)
 */

import { useTheme } from "@tooee/themes";
import type { ReactNode } from "react";

import type { ChatTurn, ChatTurnRole } from "./chat-state.js";
import type { HistoryRow } from "./history-rows.js";
import { turnLabel } from "./history-rows.js";
import { ImageBlock, ThinkingBlock, ToolCallBlock } from "./turn-parts.js";

const ROLE_COLOR: Record<ChatTurnRole, "accent" | "error" | "primary"> = {
  assistant: "accent",
  error: "error",
  user: "primary",
};

const TurnHeader = function TurnHeader({ turn }: { turn: ChatTurn }): ReactNode {
  const { theme } = useTheme();

  return (
    <text fg={theme[ROLE_COLOR[turn.role]]}>
      <strong>{turnLabel(turn)}</strong>
    </text>
  );
};

const PartView = function PartView({
  row,
  showDetails,
}: {
  row: Extract<HistoryRow, { kind: "part" }>;
  showDetails: boolean;
}): ReactNode {
  const { syntax, theme } = useTheme();
  const { part, turn, live } = row;

  switch (part.kind) {
    case "text": {
      return turn.role === "assistant" ? (
        <markdown content={part.text} syntaxStyle={syntax} streaming={live} />
      ) : (
        <text content={part.text} fg={turn.role === "error" ? theme.error : theme.text} />
      );
    }

    case "thinking": {
      return <ThinkingBlock part={part} streaming={live} showDetails={showDetails} />;
    }

    case "toolCall": {
      return <ToolCallBlock part={part} showDetails={showDetails} />;
    }

    case "image": {
      return <ImageBlock image={part} />;
    }

    default: {
      return null;
    }
  }
};

export const HistoryRowView = function HistoryRowView({
  row,
  showDetails,
}: {
  row: HistoryRow;
  /** Thinking and tool rows show all of their text instead of a preview. */
  showDetails: boolean;
}): ReactNode {
  return (
    <box flexDirection="column" marginBottom={row.endsTurn ? 1 : 0}>
      {row.kind === "header" ? (
        <TurnHeader turn={row.turn} />
      ) : (
        <PartView row={row} showDetails={showDetails} />
      )}
    </box>
  );
};
