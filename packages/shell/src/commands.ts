import { useRenderer } from "@opentui/react"
import { copyToClipboard } from "@tooee/clipboard"
import { useCommand, type CommandWhen } from "@tooee/commands"
import { useToast } from "@tooee/toasts"
import { useThemePicker, type ThemePickerState } from "./theme-picker.js"

export function useThemeCommands(opts?: { when?: CommandWhen }): {
  name: string
  picker: ThemePickerState
} {
  const picker = useThemePicker()
  const { toast } = useToast()

  // Wrap picker.confirm to toast on theme selection (event-driven, not effect-driven)
  const confirmedPicker: ThemePickerState = {
    ...picker,
    confirm: (name: string) => {
      picker.confirm(name)
      toast({ message: `Theme: ${name}`, level: "info", id: "theme-changed" })
    },
  }

  useCommand({
    id: "cycle-theme",
    title: "Choose theme",
    hotkey: "t",
    when: opts?.when,
    handler: () => {
      picker.open()
    },
  })

  return { name: picker.currentTheme, picker: confirmedPicker }
}

export function useQuitCommand(opts?: {
  hotkey?: string
  when?: CommandWhen
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

export function useCopyCommand(opts: { getText: () => string | undefined; when?: CommandWhen }) {
  useCommand({
    id: "copy",
    title: "Copy to clipboard",
    hotkey: "y",
    when: opts.when,
    handler: (ctx) => {
      const text = opts.getText()
      if (text) {
        void copyToClipboard(text)
        ctx.toast.toast({ message: "Copied to clipboard", level: "success" })
      } else {
        ctx.toast.toast({ message: "Nothing to copy", level: "warning" })
      }
    },
  })
}

export function useToggleLineNumbersCommand(opts: {
  showLineNumbers: boolean
  onToggle: () => void
  when?: CommandWhen
}) {
  useCommand({
    id: "toggle-line-numbers",
    title: "Toggle line numbers",
    hotkey: "shift+l",
    when: opts.when,
    handler: (ctx) => {
      opts.onToggle()
      const next = !opts.showLineNumbers
      ctx.toast.toast({
        message: `Line numbers: ${next ? "on" : "off"}`,
        level: "info",
        id: "line-numbers-toggled",
      })
    },
  })
}
