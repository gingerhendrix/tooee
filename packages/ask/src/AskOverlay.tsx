import { useState, useRef, useCallback, useEffect } from "react"
import type {
  TextareaRenderable,
  InputRenderable,
  MouseEvent,
  KeyEvent,
  PasteEvent,
  CursorStyleOptions,
} from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { readPrimaryText } from "@tooee/clipboard"
import { useTheme } from "@tooee/themes"
import { useMode, useSetMode } from "@tooee/commands"
import {
  appendAtCursor,
  handleEditBufferVimMotion,
  openLineAtCursor,
  type VimMotionState,
} from "./vim-motions.js"

export interface AskOverlayProps {
  prompt: string
  multiline?: boolean
  defaultValue?: string
  onSubmit: (value: string) => void | Promise<void>
  onCancel: () => void
}

export function AskOverlay({
  prompt,
  multiline,
  defaultValue,
  onSubmit,
  onCancel,
}: AskOverlayProps) {
  const { theme } = useTheme()
  const mode = useMode()
  const setMode = useSetMode()

  const [value, setValue] = useState(defaultValue ?? "")
  const textareaRef = useRef<TextareaRenderable>(null)
  const inputRef = useRef<InputRenderable>(null)
  const didPositionInitialCursorRef = useRef(false)
  const vimMotionStateRef = useRef<VimMotionState>({ pendingG: false })

  const inputFocused = mode === "insert" || mode === "cursor"
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
    onSubmit(text)
  }

  useKeyboard((key) => {
    if (key.name === "escape") {
      key.preventDefault()
      if (mode === "insert") {
        setMode("cursor")
      }
      // In cursor mode, escape does nothing - use 'q' to quit/cancel.
      return
    }

    if (mode === "cursor") {
      if (key.name === "q" || key.raw === "q") {
        key.preventDefault()
        onCancel()
        return
      }
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
  const hintText =
    mode === "insert" ? `${submitHint}  Esc commands` : `i insert  q quit  ${submitHint}`

  return (
    <box
      position="absolute"
      left="20%"
      right="20%"
      top="20%"
      bottom="20%"
      flexDirection="column"
      backgroundColor={theme.backgroundPanel}
      border
      borderColor={theme.borderActive}
      onMouseDown={handleMouseDown}
    >
      {/* Title bar */}
      <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={theme.backgroundElement}>
        <text content={prompt} fg={theme.accent} />
      </box>

      {/* Input area */}
      <box flexDirection="column" style={{ flexGrow: 1, paddingLeft: 1, paddingRight: 1 }}>
        {multiline ? (
          <textarea
            ref={textareaRef}
            focused={inputFocused}
            initialValue={defaultValue}
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

      {/* Hint line */}
      <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={theme.backgroundElement}>
        <text content={hintText} fg={theme.textMuted} />
      </box>
    </box>
  )
}
