import { useState } from "react"
import { useRenderer } from "@opentui/react"
import { useCommand, useActions } from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import { useTheme, ThemePicker } from "@tooee/themes"
import { useThemeCommands } from "@tooee/shell"
import type { AskOptions, AskInteractionHandler } from "./types.ts"

interface AskProps extends AskOptions {
  onSubmit?: (value: string) => void
  interactionHandler?: AskInteractionHandler
}

export function Ask({ prompt, placeholder, defaultValue, onSubmit, interactionHandler }: AskProps) {
  const renderer = useRenderer()
  const [value, setValue] = useState(defaultValue ?? "")

  const { theme } = useTheme()
  const { name: themeName, picker: themePicker } = useThemeCommands()

  useCommand({
    id: "cancel",
    title: "Cancel",
    hotkey: "escape",
    handler: () => {
      renderer.destroy()
    },
  })

  const customActions: ActionDefinition[] | undefined = interactionHandler?.actions.map(
    (action) => ({
      id: action.id,
      title: action.title,
      hotkey: action.hotkey,
      handler: () => {
        action.handler(value)
      },
    }),
  )

  useActions(customActions)

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(value)
    } else {
      renderer.destroy()
      process.stdout.write(value + "\n")
      return
    }
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
