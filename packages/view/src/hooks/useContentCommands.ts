import { useState } from "react";
import { useCopyCommand, useToggleLineNumbersCommand } from "@tooee/shell";
import { useConfig } from "@tooee/config";
import type { AnyContent } from "../types.js";

interface UseContentCommandsParams {
  content: AnyContent | null;
  textContent: string;
}

/**
 * The commands a content viewer owns on top of `DocumentScreen`: copying the
 * whole document and toggling the line-number gutter. Theme, quit, actions and
 * every row-level command belong to the document controller and its screen.
 */
export const useContentCommands = function useContentCommands({
  content,
  textContent,
}: UseContentCommandsParams) {
  const config = useConfig();
  const [showLineNumbers, setShowLineNumbers] = useState(config.view?.gutter ?? true);

  useCopyCommand({
    getText: () => (content ? textContent : undefined),
  });
  useToggleLineNumbersCommand({
    onToggle: () => setShowLineNumbers((v) => !v),
    showLineNumbers,
  });

  return { showLineNumbers };
};
