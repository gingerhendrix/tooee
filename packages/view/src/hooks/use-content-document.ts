import type { ActionDefinition } from "@tooee/commands";
import type { StatusBarItem } from "@tooee/layout";
import type { DecorationLayer } from "@tooee/renderers";
import { useDocumentController } from "@tooee/shell";
import type { DocumentController, DocumentRowAdapter } from "@tooee/shell";
import type { AnyContent } from "../types.js";
import { useContentCommands } from "./use-content-commands.js";

interface ContentDocumentProps {
  actions?: ActionDefinition[];
  content: AnyContent;
  decorations: DecorationLayer[];
  textContent: string;
}

interface ContentDocumentOptions<T> {
  buildStatusItems?: (document: DocumentController<T>) => StatusBarItem[];
  contextMenu?: boolean;
  multiSelect: boolean;
  preserveCursorByKey?: boolean;
  statusItems?: StatusBarItem[];
}

/** Shared document state used by each built-in content subview. */
export interface ContentDocumentResult<T> {
  document: DocumentController<T>;
  showLineNumbers: boolean;
  statusItems: StatusBarItem[];
}

/** Build the command, controller, and status state shared by content subviews. */
export const useContentDocument = function useContentDocument<T>(
  rows: readonly T[],
  adapter: DocumentRowAdapter<T>,
  { actions, content, decorations, textContent }: ContentDocumentProps,
  options: ContentDocumentOptions<T>,
): ContentDocumentResult<T> {
  const { showLineNumbers } = useContentCommands({ content, textContent });
  const document = useDocumentController<T>({
    adapter,
    contextMenu: options.contextMenu === false ? false : actions,
    decorations,
    multiSelect: options.multiSelect,
    preserveCursorByKey: options.preserveCursorByKey,
    rows,
  });
  const statusItems = options.buildStatusItems?.(document) ??
    options.statusItems ?? [
      { label: "Format:", value: content.format },
      { label: "Lines:", value: String(rows.length) },
    ];

  return { document, showLineNumbers, statusItems };
};
