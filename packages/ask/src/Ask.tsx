import { useState, useRef, useCallback } from "react"
import type { TextareaRenderable, InputRenderable, MouseEvent } from "@opentui/core"
import { useKeyboard, useRenderer } from "@opentui/react"
import { readPrimaryText } from "@tooee/clipboard"
import { AppLayout } from "@tooee/layout"
import { useHasOverlay } from "@tooee/overlays"
import { ThemePicker, useTheme } from "@tooee/themes"
import { useThemeCommands, useQuitCommand, usePasteCommands } from "@tooee/shell"
import {
  useMode,
  useSetMode,
  useCommand,
  useActions,
  useProvideCommandContext,
  useCommandContext,
} from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import type { AskOptions } from "./types.js"

interface AskProps extends AskOptions {
  actions?: ActionDefinition[]
}

export function Ask({ title, prompt, placeholder, defaultValue, multiline, actions }: AskProps) {
  const renderer = useRenderer()
  const [value, setValue] = useState(defaultValue ?? "")
  const textareaRef = useRef<TextareaRenderable>(null)
  const inputRef = useRef<InputRenderable>(null)
  const { invoke } = useCommandContext()

  const { theme } = useTheme()
  const { name: themeName, picker: themePicker } = useThemeCommands()
  useQuitCommand()

  const mode = useMode()
  const setMode = useSetMode()
  const hasOverlay = useHasOverlay()
  const inputFocused = mode === "insert" && !hasOverlay

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

  // Paste commands (available via command palette)
  usePasteCommands({
    getTarget: () => (multiline ? textareaRef.current : inputRef.current),
  })

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
    if (hasOverlay) return
    if (key.name === "escape") {
      if (mode === "insert") {
        setMode("cursor")
      }
      // In cursor mode, escape does nothing - use 'q' to quit
      return
    }
    if (key.name === "return") {
      if (multiline ? key.shift : true) {
        handleSubmit()
      }
      return
    }
  })

  // Middle-click paste from primary selection
  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (event.button === 1) {
        event.preventDefault()
        void readPrimaryText().then((text) => {
          if (!text) return
          const target = multiline ? textareaRef.current : inputRef.current
          target?.insertText(text)
        })
      }
    },
    [multiline],
  )

  const submitHint = multiline ? "Shift+Enter submit" : "Enter submit"
  const hintParts =
    mode === "insert"
      ? [submitHint, "Esc commands"]
      : ["i insert", "q quit", ": palette", submitHint]

  return (
    <AppLayout
      titleBar={title ? { title } : undefined}
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
      <box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        style={{ flexGrow: 1 }}
        onMouseDown={handleMouseDown}
      >
        <box
          flexDirection="column"
          width="100%"
          maxWidth={80}
          style={{ flexGrow: 1, padding: 1 }}
        >
          {prompt && (
            <text fg={theme.text} style={{ marginBottom: 1 }}>
              <strong>{prompt}</strong>
            </text>
          )}
          {multiline ? (
            <textarea
              ref={textareaRef}
              focused={inputFocused}
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
              ref={inputRef}
              focused={inputFocused}
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
      </box>
    </AppLayout>
  )
}
