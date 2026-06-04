import { useState, useRef, useCallback, useEffect } from "react"
import type {
  TextareaRenderable,
  InputRenderable,
  MouseEvent,
  KeyEvent,
  PasteEvent,
  CursorStyleOptions,
} from "@opentui/core"
import { useKeyboard, useRenderer } from "@opentui/react"
import { readPrimaryText } from "@tooee/clipboard"
import { AppLayout } from "@tooee/layout"
import { useHasOverlay } from "@tooee/overlays"
import { ThemePicker, useTheme } from "@tooee/themes"
import { useThemeCommands, useQuitCommand, usePasteCommands } from "@tooee/shell"
import {
  useMode,
  useSetMode,
  useActions,
  useProvideCommandContext,
  useCommandContext,
} from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import type { AskOptions } from "./types.js"
import {
  appendAtCursor,
  handleEditBufferVimMotion,
  openLineAtCursor,
  type VimMotionState,
} from "./vim-motions.js"

interface AskProps extends AskOptions {
  actions?: ActionDefinition[]
}

export function Ask({
  title,
  prompt,
  placeholder,
  defaultValue,
  multiline = true,
  actions,
}: AskProps) {
  const renderer = useRenderer()
  const [value, setValue] = useState(defaultValue ?? "")
  const textareaRef = useRef<TextareaRenderable>(null)
  const inputRef = useRef<InputRenderable>(null)
  const didPositionInitialCursorRef = useRef(false)
  const vimMotionStateRef = useRef<VimMotionState>({ pendingG: false })
  const { invoke } = useCommandContext()

  const { theme } = useTheme()
  const { name: themeName, picker: themePicker } = useThemeCommands()
  useQuitCommand({
    onQuit: () => {
      renderer.destroy()
      process.exit(0)
    },
  })

  const mode = useMode()
  const setMode = useSetMode()
  const hasOverlay = useHasOverlay()
  const inputFocused = (mode === "insert" || mode === "cursor") && !hasOverlay
  const cursorStyle: CursorStyleOptions =
    mode === "cursor" ? { style: "block", blinking: false } : { style: "line", blinking: true }
  const cursorColor = mode === "cursor" ? theme.accent : theme.primary

  const preventCursorModeEditorInput = (event: KeyEvent | PasteEvent) => {
    if (mode === "cursor") event.preventDefault()
  }

  useEffect(() => {
    if (didPositionInitialCursorRef.current || !defaultValue) return

    const target = multiline ? textareaRef.current : inputRef.current
    if (!target) return

    target.cursorOffset = target.plainText.length
    didPositionInitialCursorRef.current = true
  }, [defaultValue, multiline])

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

  useKeyboard((key) => {
    if (hasOverlay) return
    if (key.name === "escape") {
      if (mode === "insert") {
        setMode("cursor")
      }
      // In cursor mode, escape does nothing - use 'q' to quit
      return
    }
    if (mode === "cursor") {
      const target = multiline ? textareaRef.current : inputRef.current
      if (key.name === "i" || key.raw === "i") {
        key.preventDefault()
        vimMotionStateRef.current.pendingG = false
        setMode("insert")
        return
      }
      if (key.name === "a" || key.raw === "a") {
        key.preventDefault()
        vimMotionStateRef.current.pendingG = false
        appendAtCursor(target)
        setMode("insert")
        return
      }
      if (multiline && ((key.name === "o" && key.shift) || key.raw === "O")) {
        key.preventDefault()
        vimMotionStateRef.current.pendingG = false
        openLineAtCursor(target, "above")
        setMode("insert")
        return
      }
      if (multiline && (key.name === "o" || key.raw === "o")) {
        key.preventDefault()
        vimMotionStateRef.current.pendingG = false
        openLineAtCursor(target, "below")
        setMode("insert")
        return
      }
      if (handleEditBufferVimMotion(key, target, vimMotionStateRef.current)) return
    } else {
      vimMotionStateRef.current.pendingG = false
    }

    if (key.name === "return") {
      if (multiline ? key.shift : true) {
        key.preventDefault()
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
        <box flexDirection="column" width="100%" maxWidth={80} style={{ flexGrow: 1, padding: 1 }}>
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
              cursorColor={cursorColor}
              cursorStyle={cursorStyle}
              backgroundColor="transparent"
              onSubmit={handleSubmit}
              onKeyDown={preventCursorModeEditorInput}
              onPaste={preventCursorModeEditorInput}
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
              cursorColor={cursorColor}
              cursorStyle={cursorStyle}
              backgroundColor="transparent"
              onKeyDown={preventCursorModeEditorInput}
              onPaste={preventCursorModeEditorInput}
            />
          )}
        </box>
      </box>
    </AppLayout>
  )
}
