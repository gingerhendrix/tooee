import { useState, useRef } from "react"
import type { TextareaRenderable } from "@opentui/core"
import { useKeyboard, useRenderer } from "@opentui/react"
import { AppLayout } from "@tooee/layout"
import { ThemePicker, useTheme } from "@tooee/themes"
import { useThemeCommands, useQuitCommand, useCommandPalette } from "@tooee/shell"
import { useMode, useSetMode, useCommand, useActions, useProvideCommandContext, useCommandContext } from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import type { AskOptions } from "./types.js"

interface AskProps extends AskOptions {
  actions?: ActionDefinition[]
}

export function Ask({ prompt, placeholder, defaultValue, multiline, actions }: AskProps) {
  const renderer = useRenderer()
  const [value, setValue] = useState(defaultValue ?? "")
  const textareaRef = useRef<TextareaRenderable>(null)
  const { invoke } = useCommandContext()

  const { theme } = useTheme()
  const { name: themeName, picker: themePicker } = useThemeCommands()
  useQuitCommand()
  useCommandPalette()

  const mode = useMode()
  const setMode = useSetMode()

  const handleSubmit = () => {
    const text = multiline ? (textareaRef.current?.plainText ?? "") : value
    if (actions?.some((a) => a.id === "submit")) {
      invoke("submit")
      return
    }
    process.stdout.write(text + "\n")
    renderer.destroy()
  }

  useProvideCommandContext(() => ({
    ask: { value: multiline ? (textareaRef.current?.plainText ?? "") : value },
    exit: () => renderer.destroy(),
  }))

  useActions(actions)

  useCommand({
    id: "ask:insert-mode-a",
    title: "Insert mode",
    hotkey: "a",
    modes: ["cursor"],
    handler: () => setMode("insert"),
    hidden: true,
  })
  useCommand({
    id: "ask:insert-mode-i",
    title: "Insert mode",
    hotkey: "i",
    modes: ["cursor"],
    handler: () => setMode("insert"),
    hidden: true,
  })

  useKeyboard((key) => {
    if (key.name === "escape") {
      if (mode === "insert") {
        setMode("cursor")
      } else {
        renderer.destroy()
      }
      return
    }
    if (key.name === "return" && !multiline) {
      handleSubmit()
      return
    }
  })

  const hintParts =
    mode === "insert"
      ? ["Enter submit", "Esc commands"]
      : ["i insert", "q quit", ": palette", "Enter submit"]

  return (
    <AppLayout
      titleBar={prompt ? { title: prompt } : undefined}
      statusBar={{
        items: [
          { label: "Mode:", value: mode },
          { label: "Theme:", value: themeName },
          { label: "", value: hintParts.join("  ") },
        ],
      }}
      scrollProps={{ focused: false }}
      overlay={
        themePicker.isOpen ? (
          <ThemePicker
            entries={themePicker.entries}
            currentTheme={themeName}
            onSelect={themePicker.confirm}
            onClose={themePicker.close}
            onNavigate={themePicker.preview}
          />
        ) : undefined
      }
    >
      <box flexDirection="column" style={{ paddingLeft: 1, paddingRight: 1 }}>
        {multiline ? (
          <textarea
            ref={textareaRef}
            focused={mode === "insert"}
            initialValue={defaultValue}
            placeholder={placeholder}
            textColor={theme.text}
            placeholderColor={theme.textMuted}
            backgroundColor="transparent"
            onSubmit={handleSubmit}
            style={{ flexGrow: 1 }}
          />
        ) : (
          <input
            focused={mode === "insert"}
            value={value}
            onInput={setValue}
            onSubmit={handleSubmit}
            placeholder={placeholder}
            textColor={theme.text}
            placeholderColor={theme.textMuted}
            cursorColor={theme.primary}
            backgroundColor="transparent"
          />
        )}
      </box>
    </AppLayout>
  )
}
