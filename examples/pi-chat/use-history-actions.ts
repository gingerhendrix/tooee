/**
 * History panel actions on the row at the cursor: show or hide the full
 * text of one thinking or tool block, and copy the message of the turn.
 * The panel registers them, so they work only while the panel is active.
 */

import { copyToClipboard } from "@tooee/clipboard";
import { useActions } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import type { DocumentController } from "@tooee/shell";
import { useState } from "react";

import type { HistoryRow } from "./history-rows.js";
import { hasDetails, partText, turnText } from "./history-rows.js";

export const TOGGLE_ROW_HOTKEY = "enter";

export const COPY_MESSAGE_HOTKEY = "y m";

const toggleKey = function toggleKey(keys: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(keys);

  if (!next.delete(key)) {
    next.add(key);
  }

  return next;
};

/** The text "copy message" copies: the turn's text parts, else the row itself. */
const messageText = function messageText(row: HistoryRow): string {
  const text = turnText(row.turn);

  if (text !== "" || row.kind === "header") {
    return text;
  }

  return partText(row.part);
};

export interface HistoryActions {
  /** Row keys of thinking and tool blocks that show their full text. */
  expanded: ReadonlySet<string>;
}

export const useHistoryActions = function useHistoryActions(
  controller: DocumentController<HistoryRow>
): HistoryActions {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const { activeRow } = controller;

  const actions: ActionDefinition[] = [
    {
      group: "History",
      handler: () => {
        if (activeRow !== undefined) {
          setExpanded((keys) => toggleKey(keys, activeRow.key));
        }
      },
      hotkey: TOGGLE_ROW_HOTKEY,
      id: "history.toggle-row-details",
      modes: ["cursor"],
      title: "Show or hide this block in full",
      when: () => activeRow !== undefined && hasDetails(activeRow),
    },
    {
      group: "History",
      handler: async (ctx) => {
        const text = activeRow === undefined ? "" : messageText(activeRow);

        if (text === "") {
          ctx.toast?.toast({ level: "warning", message: "Nothing to copy" });

          return;
        }

        try {
          await copyToClipboard(text);
          ctx.toast?.toast({ level: "success", message: "Copied message to clipboard" });
        } catch {
          // No clipboard tool, or it closed its input early (EPIPE).
          ctx.toast?.toast({ level: "warning", message: "Could not reach the clipboard" });
        }
      },
      hotkey: COPY_MESSAGE_HOTKEY,
      id: "history.copy-message",
      modes: ["cursor"],
      title: "Copy message",
      when: () => activeRow !== undefined,
    },
  ];

  useActions(actions);

  return { expanded };
};
