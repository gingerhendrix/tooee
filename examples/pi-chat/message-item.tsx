/**
 * One chat turn: a role label line, then its parts in order. Assistant text
 * renders with the OpenTUI `<markdown>` element in streaming mode; user and
 * error text render plain. Thinking, tool calls, and images use the views in
 * turn-parts.tsx. (Tooee's MarkdownView is a scrolling document, so it
 * cannot stack inside the history scrollbox.)
 */

import { useTheme } from "@tooee/themes";
import type { ReactNode } from "react";

import type { ChatTurn, ChatTurnRole } from "./chat-state.js";
import type { TurnPart } from "./content-parts.js";
import { ImageBlock, ThinkingBlock, ToolCallBlock } from "./turn-parts.js";

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

interface PartViewProps {
  turn: ChatTurn;
  part: TurnPart;
  /** True for the newest part of a streaming turn: only it can still grow. */
  live: boolean;
  showDetails: boolean;
}

const PartView = function PartView({ turn, part, live, showDetails }: PartViewProps): ReactNode {
  const { syntax, theme } = useTheme();

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

export const MessageItem = function MessageItem({
  turn,
  showDetails,
}: {
  turn: ChatTurn;
  showDetails: boolean;
}): ReactNode {
  const { theme } = useTheme();
  const lastIndex = turn.parts.length - 1;

  return (
    <box flexDirection="column" marginBottom={1}>
      <text fg={theme[ROLE_COLOR[turn.role]]}>
        <strong>{turnLabel(turn)}</strong>
      </text>
      {turn.parts.map((part, index): ReactNode => (
        <PartView
          // Parts only grow at the end, so the index is a stable key.
          key={index}
          turn={turn}
          part={part}
          live={turn.streaming && index === lastIndex}
          showDetails={showDetails}
        />
      ))}
    </box>
  );
};
