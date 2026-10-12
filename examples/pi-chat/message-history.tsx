/**
 * Message history panel body: a Tooee row document of chat turns, or a
 * status message while the session boots or after it fails. The document
 * follows the tail while a reply streams, and gives the panel a row cursor,
 * search (/), and copy. The history actions work on the row at the cursor.
 */

import { SearchBar } from "@tooee/search";
import type { SearchState } from "@tooee/search";
import { Document, useDocumentController } from "@tooee/shell";
import { useTheme } from "@tooee/themes";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { ChatState } from "./chat-state.js";
import { HistoryRowView } from "./history-row.js";
import { historyRowAdapter, historyRows } from "./history-rows.js";
import { useHistoryActions } from "./use-history-actions.js";

const EmptyState = function EmptyState({ state }: { state: ChatState }): ReactNode {
  const { theme } = useTheme();

  if (state.phase === "failed") {
    return (
      <box flexDirection="column" paddingLeft={1} paddingRight={1}>
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

  return <text content={message} fg={theme.textMuted} paddingLeft={1} />;
};

const HistorySearchBar = function HistorySearchBar({ search }: { search: SearchState }): ReactNode {
  const handleQueryChange = search.setSearchQuery;
  const handleSubmit = search.submitSearch;

  const handleCancel = (): void => {
    search.setSearchQuery("");
  };

  return (
    <SearchBar
      query={search.searchQuery}
      onQueryChange={handleQueryChange}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      matchCount={search.matchingLines.length}
      currentMatch={search.currentMatchIndex}
    />
  );
};

export const MessageHistory = function MessageHistory({ state }: { state: ChatState }): ReactNode {
  const rows = useMemo(() => historyRows(state.turns), [state.turns]);

  const controller = useDocumentController({
    adapter: historyRowAdapter,
    followTail: true,
    preserveCursorByKey: true,
    rows,
  });

  const { expanded } = useHistoryActions(controller);
  const { search } = controller;

  return (
    <box flexDirection="column" flexGrow={1}>
      {rows.length === 0 ? (
        <EmptyState state={state} />
      ) : (
        <Document
          controller={controller}
          showLineNumbers={false}
          // One column for the cursor and search-match signs.
          signColumnWidth={1}
          style={{ flexGrow: 1, paddingRight: 1 }}
          renderRow={(row): ReactNode => (
            <HistoryRowView row={row} showDetails={state.showDetails || expanded.has(row.key)} />
          )}
        />
      )}
      {search?.searchActive === true ? <HistorySearchBar search={search} /> : null}
    </box>
  );
};
