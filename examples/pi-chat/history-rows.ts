/**
 * Row model for the history document. Each turn becomes a header row, then
 * one row for each of its parts (text, thinking, tool call, image). The
 * Tooee document controller navigates, searches, and copies these rows.
 * No React.
 */

import type { DocumentRowAdapter } from "@tooee/shell";

import type { ChatTurn, ChatTurnRole } from "./chat-state.js";
import type { TurnPart } from "./content-parts.js";
import { argsSummary, imageLabel, TOOL_STATUS_LABEL } from "./part-format.js";

interface RowBase {
  key: string;
  turn: ChatTurn;
  /** True for the last row of a turn, which gets a blank line below. */
  endsTurn: boolean;
}

export type HistoryRow =
  | (RowBase & { kind: "header" })
  | (RowBase & {
      kind: "part";
      part: TurnPart;
      /** True for the newest part of a streaming turn: only it can still grow. */
      live: boolean;
    });

const ROLE_LABEL: Record<ChatTurnRole, string> = {
  assistant: "Assistant",
  error: "Error",
  user: "You",
};

const assistantSuffix = function assistantSuffix(turn: ChatTurn): string {
  if (turn.streaming) {
    return " …";
  }

  return turn.aborted ? " (aborted)" : "";
};

/** "You", "Error", or the assistant's model label with a streaming or aborted mark. */
export const turnLabel = function turnLabel(turn: ChatTurn): string {
  if (turn.role !== "assistant") {
    return ROLE_LABEL[turn.role];
  }

  return `${turn.model ?? ROLE_LABEL.assistant}${assistantSuffix(turn)}`;
};

export const historyRows = function historyRows(turns: readonly ChatTurn[]): HistoryRow[] {
  return turns.flatMap((turn): HistoryRow[] => {
    const lastIndex = turn.parts.length - 1;
    const header: HistoryRow = { endsTurn: lastIndex < 0, key: `${turn.id}`, kind: "header", turn };

    return [
      header,
      // Parts only grow at the end, so the part index is a stable key.
      ...turn.parts.map((part, index): HistoryRow => ({
        endsTurn: index === lastIndex,
        key: `${turn.id}.${index}`,
        kind: "part",
        live: turn.streaming && index === lastIndex,
        part,
        turn,
      })),
    ];
  });
};

/** Plain text of one part, for search and copy. */
export const partText = function partText(part: TurnPart): string {
  switch (part.kind) {
    case "text": {
      return part.text;
    }

    case "thinking": {
      return part.text === "" ? "Thinking" : `Thinking\n${part.text}`;
    }

    case "toolCall": {
      const args = argsSummary(part.args, Number.POSITIVE_INFINITY);
      const head = `${part.name}${args === "" ? "" : ` ${args}`} · ${TOOL_STATUS_LABEL[part.status]}`;

      return part.result === undefined || part.result.text === ""
        ? head
        : `${head}\n${part.result.text}`;
    }

    case "image": {
      return imageLabel(part);
    }

    default: {
      return "";
    }
  }
};

/** The text parts of a turn: what "copy message" puts on the clipboard. */
export const turnText = function turnText(turn: ChatTurn): string {
  return turn.parts
    .flatMap((part) => (part.kind === "text" ? [part.text.trim()] : []))
    .filter((text) => text !== "")
    .join("\n\n");
};

/** Thinking and tool-call rows have a short preview and a full form. */
export const hasDetails = function hasDetails(row: HistoryRow): boolean {
  return row.kind === "part" && (row.part.kind === "thinking" || row.part.kind === "toolCall");
};

export const historyRowAdapter: DocumentRowAdapter<HistoryRow> = {
  getKey: (row) => row.key,
  getText: (row) => (row.kind === "header" ? turnLabel(row.turn) : partText(row.part)),
};
