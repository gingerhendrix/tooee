import { useMemo } from "react";
import { useTheme } from "@tooee/themes";
import type { RowDocumentPalette } from "./RowDocumentRenderable.js";

export function useGutterPalette(): RowDocumentPalette {
  const { theme } = useTheme();

  return useMemo(
    () => ({
      gutterBg: theme.backgroundElement,
      gutterFg: theme.textMuted,
    }),
    [theme.textMuted, theme.backgroundElement],
  );
}
