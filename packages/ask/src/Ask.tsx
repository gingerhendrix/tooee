import { useState } from "react"
import { CommandProvider, useCommand } from "@tooee/commands"
import type { AskOptions, AskInteractionHandler } from "./types.ts"

interface AskProps extends AskOptions {
  onSubmit?: (value: string) => void
  interactionHandler?: AskInteractionHandler
}

export function Ask(props: AskProps) {
  return (
    <CommandProvider>
      <AskInner {...props} />
    </CommandProvider>
  )
}

function AskInner({ prompt, placeholder, defaultValue, onSubmit, interactionHandler }: AskProps) {
  const [value, setValue] = useState(defaultValue ?? "")

  useCommand({
    id: "cancel",
    title: "Cancel",
    hotkey: "escape",
    handler: () => {
      process.exit(0)
    },
  })

  // Register custom actions
  if (interactionHandler) {
    for (const action of interactionHandler.actions) {
      useCommand({
        id: action.id,
        title: action.title,
        hotkey: action.hotkey,
        handler: () => {
          action.handler(value)
        },
      })
    }
  }

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(value)
    } else {
      process.stdout.write(value + "\n")
    }
    process.exit(0)
  }

  return (
    <box style={{ flexDirection: "column" }}>
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
    </box>
  )
}
