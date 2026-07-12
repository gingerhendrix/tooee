import { useMemo } from "react";
import { useTheme } from "@tooee/themes";
import type { RowDocumentPalette } from "./row-document-renderable.js";

export const useGutterPalette = function useGutterPalette(): RowDocumentPalette {
  const { theme } = useTheme();

  return useMemo(
    () => ({
      gutterBg: theme.backgroundElement,
      gutterFg: theme.textMuted,
    }),
    [theme.textMuted, theme.backgroundElement],
  );
};
