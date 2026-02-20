import { useTerminalDimensions } from "@opentui/react"
import { useTheme } from "@tooee/themes"
import { useToast } from "./ToastProvider.js"
import type { ToastLevel } from "./types.js"

const LEVEL_ICONS: Record<ToastLevel, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✗",
}

function getLevelColor(theme: ReturnType<typeof useTheme>["theme"], level: ToastLevel): string {
  switch (level) {
    case "info":
      return theme.info
    case "success":
      return theme.success
    case "warning":
      return theme.warning
    case "error":
      return theme.error
  }
}

export function ToastContainer() {
  const { currentToast } = useToast()
  const { theme } = useTheme()
  const { width: termWidth } = useTerminalDimensions()

  if (!currentToast) return null

  const maxWidth = Math.min(50, termWidth - 4)
  const borderColor = getLevelColor(theme, currentToast.level)
  const icon = LEVEL_ICONS[currentToast.level]

  return (
    <box
      position="absolute"
      bottom={1}
      right={1}
      maxWidth={maxWidth}
      border
      borderColor={borderColor}
      backgroundColor={theme.backgroundPanel}
      paddingLeft={1}
      paddingRight={1}
    >
      <text
        content={`${icon} ${currentToast.message}`}
        fg={theme.text}
      />
    </box>
  )
}
