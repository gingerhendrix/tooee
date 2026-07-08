import { useState, useRef, useCallback, useEffect } from "react"
import type {
  TextareaRenderable,
  InputRenderable,
  MouseEvent,
  KeyEvent,
  PasteEvent,
  CursorStyleOptions,
} from "@opentui/core"
import { readPrimaryText } from "@tooee/clipboard"
import { useTheme, CloseButton } from "@tooee/themes"
import { useCommand, useMode, useSetMode } from "@tooee/commands"
import { EditorScrollbar } from "./EditorScrollbar.js"
import { appendAtCursor, openLineAtCursor, type VimMotionState } from "./vim-motions.js"

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
  // Bumped whenever the editor viewport may have moved (cursor, content, wheel)
  // so the scrollbar thumb re-computes from the editor's internal scroll state.
  const [scrollRevision, setScrollRevision] = useState(0)
  const bumpScroll = useCallback(() => setScrollRevision((r) => r + 1), [])

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

  // Ensure the scrollbar computes once the editor ref and layout exist.
  useEffect(() => {
    bumpScroll()
  }, [bumpScroll])

  const handleSubmit = () => {
    const text = multiline ? (textareaRef.current?.plainText ?? "") : value
    onSubmit(text)
  }

  const enterInsertMode = useCallback(() => {
    vimMotionStateRef.current.pendingG = false
    setMode("insert")
  }, [setMode])

  const appendAndEnterInsertMode = useCallback(() => {
    vimMotionStateRef.current.pendingG = false
    appendAtCursor(multiline ? textareaRef.current : inputRef.current)
    setMode("insert")
  }, [multiline, setMode])

  const openLineAbove = useCallback(() => {
    if (!multiline) return
    vimMotionStateRef.current.pendingG = false
    openLineAtCursor(textareaRef.current, "above")
    setMode("insert")
  }, [multiline, setMode])

  const openLineBelow = useCallback(() => {
    if (!multiline) return
    vimMotionStateRef.current.pendingG = false
    openLineAtCursor(textareaRef.current, "below")
    setMode("insert")
  }, [multiline, setMode])

  const leaveInsertMode = useCallback(() => {
    vimMotionStateRef.current.pendingG = false
    setMode("cursor")
  }, [setMode])

  useCommand({
    id: "ask-overlay:leave-insert-mode",
    title: "Command mode",
    hotkey: "Escape",
    modes: ["insert"],
    hidden: true,
    handler: leaveInsertMode,
  })
  useCommand({
    id: "ask-overlay:cancel",
    title: "Cancel",
    hotkey: "q",
    modes: ["cursor"],
    hidden: true,
    handler: onCancel,
  })
  useCommand({
    id: "ask-overlay:insert-mode-i",
    title: "Insert mode",
    hotkey: "i",
    modes: ["cursor"],
    hidden: true,
    handler: enterInsertMode,
  })
  useCommand({
    id: "ask-overlay:insert-mode-a",
    title: "Append",
    hotkey: "a",
    modes: ["cursor"],
    hidden: true,
    handler: appendAndEnterInsertMode,
  })
  useCommand({
    id: "ask-overlay:open-line-above",
    title: "Open line above",
    hotkey: "shift+o",
    modes: ["cursor"],
    hidden: true,
    when: () => multiline === true,
    handler: openLineAbove,
  })
  useCommand({
    id: "ask-overlay:open-line-below",
    title: "Open line below",
    hotkey: "o",
    modes: ["cursor"],
    hidden: true,
    when: () => multiline === true,
    handler: openLineBelow,
  })
  useCommand({
    id: "ask-overlay:submit-single-line",
    title: "Submit",
    hotkey: "Enter",
    modes: ["insert", "cursor"],
    hidden: true,
    when: () => multiline !== true,
    handler: handleSubmit,
  })
  useCommand({
    id: "ask-overlay:submit-multiline",
    title: "Submit",
    hotkey: "shift+Enter",
    modes: ["insert", "cursor"],
    hidden: true,
    when: () => multiline === true,
    handler: handleSubmit,
  })

  const getMotionTarget = useCallback(
    () => (multiline ? textareaRef.current : inputRef.current),
    [multiline],
  )
  const motion = useCallback(
    (run: (target: NonNullable<ReturnType<typeof getMotionTarget>>) => void) => {
      const target = getMotionTarget()
      if (target) run(target as NonNullable<ReturnType<typeof getMotionTarget>>)
      vimMotionStateRef.current.pendingG = false
      bumpScroll()
    },
    [getMotionTarget, bumpScroll],
  )

  useCommand({
    id: "ask-overlay:move-left",
    title: "Move left",
    hotkey: "h",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.moveCursorLeft()),
  })
  useCommand({
    id: "ask-overlay:move-left-arrow",
    title: "Move left",
    hotkey: "left",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.moveCursorLeft()),
  })
  useCommand({
    id: "ask-overlay:move-right",
    title: "Move right",
    hotkey: "l",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.moveCursorRight()),
  })
  useCommand({
    id: "ask-overlay:move-right-arrow",
    title: "Move right",
    hotkey: "right",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.moveCursorRight()),
  })
  useCommand({
    id: "ask-overlay:move-down",
    title: "Move down",
    hotkey: "j",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.moveCursorDown()),
  })
  useCommand({
    id: "ask-overlay:move-down-arrow",
    title: "Move down",
    hotkey: "down",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.moveCursorDown()),
  })
  useCommand({
    id: "ask-overlay:move-up",
    title: "Move up",
    hotkey: "k",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.moveCursorUp()),
  })
  useCommand({
    id: "ask-overlay:move-up-arrow",
    title: "Move up",
    hotkey: "up",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.moveCursorUp()),
  })
  useCommand({
    id: "ask-overlay:line-home",
    title: "Line home",
    hotkey: "0",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.gotoLineHome()),
  })
  useCommand({
    id: "ask-overlay:line-home-key",
    title: "Line home",
    hotkey: "home",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.gotoLineHome()),
  })
  useCommand({
    id: "ask-overlay:line-end",
    title: "Line end",
    hotkey: "shift+4",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.gotoLineEnd()),
  })
  useCommand({
    id: "ask-overlay:line-end-key",
    title: "Line end",
    hotkey: "end",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.gotoLineEnd()),
  })
  useCommand({
    id: "ask-overlay:word-forward",
    title: "Word forward",
    hotkey: "w",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.moveWordForward()),
  })
  useCommand({
    id: "ask-overlay:word-backward",
    title: "Word backward",
    hotkey: "b",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.moveWordBackward()),
  })
  useCommand({
    id: "ask-overlay:buffer-home",
    title: "Buffer home",
    hotkey: "g g",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.gotoBufferHome()),
  })
  useCommand({
    id: "ask-overlay:buffer-end",
    title: "Buffer end",
    hotkey: "shift+g",
    modes: ["cursor"],
    hidden: true,
    handler: () => motion((target) => target.gotoBufferEnd()),
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
      <box
        flexDirection="row"
        height={1}
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={theme.backgroundElement}
      >
        <text content={prompt} fg={theme.accent} style={{ flexGrow: 1 }} />
        <CloseButton onClose={onCancel} />
      </box>

      {/* Input area */}
      <box flexDirection="column" style={{ flexGrow: 1, paddingLeft: 1, paddingRight: 1 }}>
        {multiline ? (
          <box flexDirection="row" style={{ flexGrow: 1 }} onMouseScroll={bumpScroll}>
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
              onCursorChange={bumpScroll}
              onContentChange={bumpScroll}
              style={{ flexGrow: 1 }}
            />
            <EditorScrollbar
              target={textareaRef.current}
              revision={scrollRevision}
              color={theme.textMuted}
            />
          </box>
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
