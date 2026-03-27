import { useMemo } from "react"
import { useTheme } from "@tooee/themes"
import type { RowDocumentPalette } from "./RowDocumentRenderable.js"

export function useGutterPalette(): RowDocumentPalette {
  const { theme } = useTheme()

  return useMemo(
    () => ({
      gutterFg: theme.textMuted,
      gutterBg: theme.backgroundElement,
    }),
    [theme.textMuted, theme.backgroundElement],
  )
}
