import { useRenderer } from "@opentui/react"
import { useThemeSwitcher, copyToClipboard } from "@tooee/react"
import { useCommand } from "@tooee/commands"

export function useThemeCommands(opts?: { when?: () => boolean }): { name: string } {
  const { nextTheme, prevTheme, name } = useThemeSwitcher()

  useCommand({
    id: "cycle-theme",
    title: "Next theme",
    hotkey: "t",
    when: opts?.when,
    handler: () => {
      nextTheme()
    },
  })

  useCommand({
    id: "cycle-theme-prev",
    title: "Previous theme",
    hotkey: "shift+t",
    when: opts?.when,
    handler: () => {
      prevTheme()
    },
  })

  return { name }
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

export function useCopyCommand(opts: {
  getText: () => string | undefined
  when?: () => boolean
}) {
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
