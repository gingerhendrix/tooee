import { useRenderer } from "@opentui/react"
import { copyToClipboard } from "@tooee/react"
import { useCommand } from "@tooee/commands"
import { useThemePicker, type ThemePickerState } from "./theme-picker.ts"

export function useThemeCommands(opts?: { when?: () => boolean }): {
  name: string
  picker: ThemePickerState
} {
  const picker = useThemePicker()

  useCommand({
    id: "cycle-theme",
    title: "Choose theme",
    hotkey: "t",
    when: opts?.when,
    handler: () => {
      picker.open()
    },
  })

  return { name: picker.currentTheme, picker }
}

export function useQuitCommand(opts?: {
  hotkey?: string
  when?: () => boolean
  onQuit?: () => void
}) {
  const renderer = useRenderer()

  useCommand({
    id: "quit",
    title: "Quit",
    hotkey: opts?.hotkey ?? "q",
    when: opts?.when,
    handler: () => {
      if (opts?.onQuit) {
        opts.onQuit()
      } else {
        renderer.destroy()
      }
    },
  })
}

export function useCopyCommand(opts: { getText: () => string | undefined; when?: () => boolean }) {
  useCommand({
    id: "copy",
    title: "Copy to clipboard",
    hotkey: "y",
    when: opts.when,
    handler: () => {
      const text = opts.getText()
      if (text) {
        void copyToClipboard(text)
      }
    },
  })
}
