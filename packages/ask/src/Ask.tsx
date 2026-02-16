import { useState } from "react"
import { useRenderer } from "@opentui/react"
import { useCommand, useActions, useProvideCommandContext, useCommandContext } from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import { useTheme, ThemePicker } from "@tooee/themes"
import { useThemeCommands } from "@tooee/shell"
import type { AskOptions } from "./types.js"

interface AskProps extends AskOptions {
  actions?: ActionDefinition[]
}

export function Ask({ prompt, placeholder, defaultValue, actions }: AskProps) {
  const renderer = useRenderer()
  const [value, setValue] = useState(defaultValue ?? "")
  const { invoke } = useCommandContext()

  const { theme } = useTheme()
  const { name: themeName, picker: themePicker } = useThemeCommands()

  useProvideCommandContext(() => ({
    ask: { value },
    exit: () => renderer.destroy(),
  }))

  useCommand({
    id: "cancel",
    title: "Cancel",
    hotkey: "escape",
    handler: (ctx) => {
      ctx.exit()
    },
  })

  useActions(actions)

  const handleSubmit = () => {
    // If there's a "submit" action registered, invoke it via the command system
    if (actions?.some((a) => a.id === "submit")) {
      invoke("submit")
      return
    }

    // Default: write to stdout and exit
    process.stdout.write(value + "\n")
    renderer.destroy()
  }

  return (
    <box flexDirection="column" width="100%" height="100%">
      {prompt && <text content={prompt} fg={theme.primary} style={{ marginBottom: 1 }} />}
      <input
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        textColor={theme.text}
        focused
      />
      <text content={`Theme: ${themeName}`} fg={theme.textMuted} style={{ marginTop: 1 }} />
      {themePicker.isOpen && (
        <ThemePicker
          entries={themePicker.entries}
          currentTheme={themeName}
          onSelect={themePicker.confirm}
          onClose={themePicker.close}
          onNavigate={themePicker.preview}
        />
      )}
    </box>
  )
}
