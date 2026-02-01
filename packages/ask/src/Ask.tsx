import { useState } from "react"
import { useRenderer } from "@opentui/react"
import { useThemeSwitcher } from "@tooee/react"
import { useCommand, useActions } from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import type { AskOptions, AskInteractionHandler } from "./types.ts"

interface AskProps extends AskOptions {
  onSubmit?: (value: string) => void
  interactionHandler?: AskInteractionHandler
}

export function Ask({ prompt, placeholder, defaultValue, onSubmit, interactionHandler }: AskProps) {
  const renderer = useRenderer()
  const [value, setValue] = useState(defaultValue ?? "")

  const { nextTheme, prevTheme, name: themeName } = useThemeSwitcher()

  useCommand({
    id: "cycle-theme",
    title: "Next theme",
    hotkey: "t",
    handler: () => {
      nextTheme()
    },
  })

  useCommand({
    id: "cycle-theme-prev",
    title: "Previous theme",
    hotkey: "shift+t",
    handler: () => {
      prevTheme()
    },
  })

  useCommand({
    id: "cancel",
    title: "Cancel",
    hotkey: "escape",
    handler: () => {
      renderer.destroy()
    },
  })

  const customActions: ActionDefinition[] | undefined = interactionHandler?.actions.map((action) => ({
    id: action.id,
    title: action.title,
    hotkey: action.hotkey,
    handler: () => {
      action.handler(value)
    },
  }))

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
      {prompt && (
        <text content={prompt} fg="#7aa2f7" style={{ marginBottom: 1 }} />
      )}
      <input
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        textColor="#c0caf5"
        focused
      />
      <text content={`Theme: ${themeName}`} fg="#565f89" style={{ marginTop: 1 }} />
    </box>
  )
}
