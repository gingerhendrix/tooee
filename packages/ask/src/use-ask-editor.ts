import { useCallback, useEffect, useRef, useState } from "react"
import type {
  InputRenderable,
  KeyEvent,
  MouseEvent,
  PasteEvent,
  TextareaRenderable,
} from "@opentui/core"
import { readPrimaryText } from "@tooee/clipboard"
import {
  useActiveCommandSurface,
  useCommand,
  useCommandSurfaceId,
  useMode,
  useProvideCommandContext,
  useSetMode,
  type Mode,
} from "@tooee/commands"
import { appendAtCursor, openLineAtCursor, type VimMotionState } from "./vim-motions.js"

declare module "@tooee/commands" {
  interface CommandContext {
    /** Contributed by ask editors: the current input value. */
    ask: { value: string }
  }
}

/** Built-in command groups; disable one to take over its keys entirely. */
export type AskEditorCommandGroup = "motions" | "insert-commands" | "submit" | "cancel" | "escape"

export type AskSubmitKey = "enter" | "shift+enter" | "none"

export interface UseAskEditorOptions {
  /** Render/edit a multiline textarea instead of a single-line input (default false). */
  multiline?: boolean
  defaultValue?: string
  placeholder?: string
  onSubmit?: (value: string) => void | Promise<void>
  /** Enables the `q` cancel command (cursor mode) when provided. */
  onCancel?: () => void
  /** Which key submits. Default: "shift+enter" when multiline, "enter" otherwise. */
  submitKey?: AskSubmitKey
  /** Prefix for command ids, default "ask" (e.g. "ask:move-left"). */
  commandScope?: string
  /** Disable built-in command groups when a consumer wants full control. */
  disable?: AskEditorCommandGroup[]
  /**
   * Force the editor to blur (e.g. while a legacy overlay covers the host
   * app). ORed with the automatic suspension derived from the command-surface
   * stack; affects focus only, never command gating.
   */
  suspended?: boolean
}

/** Programmatic text control for composites (dictation, prefill, transforms). */
export interface AskEditorController {
  /** Current text (works for input and textarea). */
  getText(): string
  /** Replace the buffer; optionally move cursor to end (default true). */
  setText(text: string, opts?: { cursorToEnd?: boolean }): void
  /** Insert at the cursor position. */
  insertText(text: string): void
  setCursorToEnd(): void
  submit(): void
  /** Current local mode (live read). */
  readonly mode: Mode
  /** Switch insert/cursor mode; resets any pending vim motion state. */
  setMode(mode: Mode): void
}

/** Everything `<AskEditor/>` needs: refs, focus, mode, handlers. */
export interface AskEditorViewModel {
  multiline: boolean
  defaultValue?: string
  placeholder?: string
  /** Single-line controlled value + change handler (unused for multiline). */
  value: string
  onInput: (value: string) => void
  textareaRef: { current: TextareaRenderable | null }
  inputRef: { current: InputRenderable | null }
  /** Local surface mode, drives cursor styling. */
  mode: Mode
  /** True while a modal command surface above this one owns keyboard input. */
  suspended: boolean
  /** Editor focus: insert/cursor mode and not suspended. */
  focused: boolean
  /** Scrollbar re-compute revision; bumped whenever the viewport may have moved. */
  scrollRevision: number
  bumpScroll: () => void
  /** Blocks editor input while in cursor mode (wire to onKeyDown/onPaste). */
  onEditorKeyDown: (event: KeyEvent | PasteEvent) => void
  onEditorPaste: (event: KeyEvent | PasteEvent) => void
  submit: () => void
  /** Middle-click primary-selection paste; attach to the surrounding panel/container. */
  onMouseDown: (event: MouseEvent) => void
}

export interface UseAskEditorResult {
  controller: AskEditorController
  editor: AskEditorViewModel
}

/**
 * Headless ask editor core: owns editor state and registers all editing
 * commands (vim motions, insert entries, submit/cancel/escape) on the nearest
 * command surface, so it works identically at the app root, inside an
 * `ownCommands` overlay, or under any `CommandSurfaceProvider`.
 */
export function useAskEditor(options: UseAskEditorOptions = {}): UseAskEditorResult {
  const { multiline = false, defaultValue, placeholder, commandScope = "ask" } = options

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

  const optionsRef = useRef(options)
  optionsRef.current = options
  const modeRef = useRef(mode)
  modeRef.current = mode
  const multilineRef = useRef(multiline)
  multilineRef.current = multiline
  const valueRef = useRef(value)
  valueRef.current = value

  // Suspension: while a modal command surface other than our own is topmost,
  // our commands are already suspended by the surface stack; this mirrors that
  // for renderable focus so the editor blurs under a nested picker.
  const surfaceId = useCommandSurfaceId()
  const activeSurface = useActiveCommandSurface()
  const suspended =
    (options.suspended ?? false) || (activeSurface !== null && activeSurface.id !== surfaceId)

  const focused = (mode === "insert" || mode === "cursor") && !suspended

  const preventCursorModeEditorInput = useCallback((event: KeyEvent | PasteEvent) => {
    if (modeRef.current === "cursor") event.preventDefault()
  }, [])

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

  const getTarget = useCallback(
    () => (multilineRef.current ? textareaRef.current : inputRef.current),
    [],
  )

  const getText = useCallback(
    () => (multilineRef.current ? (textareaRef.current?.plainText ?? "") : valueRef.current),
    [],
  )

  const submit = useCallback(() => {
    void optionsRef.current.onSubmit?.(getText())
  }, [getText])

  useProvideCommandContext(() => ({ ask: { value: getText() } }))

  const enabled = useCallback(
    (group: AskEditorCommandGroup) => !(optionsRef.current.disable?.includes(group) ?? false),
    [],
  )

  const resolveSubmitKey = useCallback((): AskSubmitKey => {
    const current = optionsRef.current
    return current.submitKey ?? (current.multiline ? "shift+enter" : "enter")
  }, [])

  const enterInsertMode = useCallback(() => {
    vimMotionStateRef.current.pendingG = false
    setMode("insert")
  }, [setMode])

  const appendAndEnterInsertMode = useCallback(() => {
    vimMotionStateRef.current.pendingG = false
    appendAtCursor(getTarget())
    setMode("insert")
  }, [getTarget, setMode])

  const openLineAbove = useCallback(() => {
    if (!multilineRef.current) return
    vimMotionStateRef.current.pendingG = false
    openLineAtCursor(textareaRef.current, "above")
    setMode("insert")
  }, [setMode])

  const openLineBelow = useCallback(() => {
    if (!multilineRef.current) return
    vimMotionStateRef.current.pendingG = false
    openLineAtCursor(textareaRef.current, "below")
    setMode("insert")
  }, [setMode])

  const leaveInsertMode = useCallback(() => {
    vimMotionStateRef.current.pendingG = false
    setMode("cursor")
  }, [setMode])

  useCommand({
    id: `${commandScope}:leave-insert-mode`,
    title: "Command mode",
    hotkey: "Escape",
    modes: ["insert"],
    hidden: true,
    when: () => enabled("escape"),
    handler: leaveInsertMode,
  })
  useCommand({
    id: `${commandScope}:cancel`,
    title: "Cancel",
    hotkey: "q",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("cancel") && optionsRef.current.onCancel !== undefined,
    handler: () => optionsRef.current.onCancel?.(),
  })
  useCommand({
    id: `${commandScope}:insert-mode-i`,
    title: "Insert mode",
    hotkey: "i",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("insert-commands"),
    handler: enterInsertMode,
  })
  useCommand({
    id: `${commandScope}:insert-mode-a`,
    title: "Append",
    hotkey: "a",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("insert-commands"),
    handler: appendAndEnterInsertMode,
  })
  useCommand({
    id: `${commandScope}:open-line-above`,
    title: "Open line above",
    hotkey: "shift+o",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("insert-commands") && multilineRef.current,
    handler: openLineAbove,
  })
  useCommand({
    id: `${commandScope}:open-line-below`,
    title: "Open line below",
    hotkey: "o",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("insert-commands") && multilineRef.current,
    handler: openLineBelow,
  })
  useCommand({
    id: `${commandScope}:submit-single-line`,
    title: "Submit",
    hotkey: "Enter",
    modes: ["insert", "cursor"],
    hidden: true,
    when: () => enabled("submit") && resolveSubmitKey() === "enter",
    handler: submit,
  })
  useCommand({
    id: `${commandScope}:submit-multiline`,
    title: "Submit",
    hotkey: "shift+Enter",
    modes: ["insert", "cursor"],
    hidden: true,
    // Shift+Enter always submits (single-line editors have no newline for it
    // to mean); plain Enter only when it is the configured submit key.
    when: () => enabled("submit") && resolveSubmitKey() !== "none",
    handler: submit,
  })

  const motion = useCallback(
    (run: (target: TextareaRenderable | InputRenderable) => void) => {
      const target = getTarget()
      if (target) run(target)
      vimMotionStateRef.current.pendingG = false
      bumpScroll()
    },
    [getTarget, bumpScroll],
  )

  useCommand({
    id: `${commandScope}:move-left`,
    title: "Move left",
    hotkey: "h",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.moveCursorLeft()),
  })
  useCommand({
    id: `${commandScope}:move-left-arrow`,
    title: "Move left",
    hotkey: "left",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.moveCursorLeft()),
  })
  useCommand({
    id: `${commandScope}:move-right`,
    title: "Move right",
    hotkey: "l",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.moveCursorRight()),
  })
  useCommand({
    id: `${commandScope}:move-right-arrow`,
    title: "Move right",
    hotkey: "right",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.moveCursorRight()),
  })
  useCommand({
    id: `${commandScope}:move-down`,
    title: "Move down",
    hotkey: "j",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.moveCursorDown()),
  })
  useCommand({
    id: `${commandScope}:move-down-arrow`,
    title: "Move down",
    hotkey: "down",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.moveCursorDown()),
  })
  useCommand({
    id: `${commandScope}:move-up`,
    title: "Move up",
    hotkey: "k",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.moveCursorUp()),
  })
  useCommand({
    id: `${commandScope}:move-up-arrow`,
    title: "Move up",
    hotkey: "up",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.moveCursorUp()),
  })
  useCommand({
    id: `${commandScope}:line-home`,
    title: "Line home",
    hotkey: "0",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.gotoLineHome()),
  })
  useCommand({
    id: `${commandScope}:line-home-key`,
    title: "Line home",
    hotkey: "home",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.gotoLineHome()),
  })
  useCommand({
    id: `${commandScope}:line-end`,
    title: "Line end",
    hotkey: "shift+4",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.gotoLineEnd()),
  })
  useCommand({
    id: `${commandScope}:line-end-key`,
    title: "Line end",
    hotkey: "end",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.gotoLineEnd()),
  })
  useCommand({
    id: `${commandScope}:word-forward`,
    title: "Word forward",
    hotkey: "w",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.moveWordForward()),
  })
  useCommand({
    id: `${commandScope}:word-backward`,
    title: "Word backward",
    hotkey: "b",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.moveWordBackward()),
  })
  useCommand({
    id: `${commandScope}:buffer-home`,
    title: "Buffer home",
    hotkey: "g g",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.gotoBufferHome()),
  })
  useCommand({
    id: `${commandScope}:buffer-end`,
    title: "Buffer end",
    hotkey: "shift+g",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("motions"),
    handler: () => motion((target) => target.gotoBufferEnd()),
  })

  // Middle-click paste from primary selection
  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (event.button === 1) {
        event.preventDefault()
        void readPrimaryText().then((text) => {
          if (!text) return
          getTarget()?.insertText(text)
        })
      }
    },
    [getTarget],
  )

  const setText = useCallback(
    (text: string, opts?: { cursorToEnd?: boolean }) => {
      const cursorToEnd = opts?.cursorToEnd ?? true
      if (multilineRef.current) {
        const target = textareaRef.current
        if (!target) return
        const prevOffset = target.cursorOffset
        target.replaceText(text)
        target.cursorOffset = cursorToEnd
          ? target.plainText.length
          : Math.min(prevOffset, target.plainText.length)
      } else {
        // Route through React state (the input is controlled) and mirror onto
        // the renderable so the change takes effect before the next render.
        const target = inputRef.current
        const prevOffset = target?.cursorOffset ?? 0
        setValue(text)
        if (target) {
          target.value = text
          target.cursorOffset = cursorToEnd
            ? target.plainText.length
            : Math.min(prevOffset, target.plainText.length)
        }
      }
      bumpScroll()
    },
    [bumpScroll],
  )

  const insertText = useCallback(
    (text: string) => {
      getTarget()?.insertText(text)
      bumpScroll()
    },
    [getTarget, bumpScroll],
  )

  const setCursorToEnd = useCallback(() => {
    const target = getTarget()
    if (!target) return
    target.cursorOffset = target.plainText.length
    bumpScroll()
  }, [getTarget, bumpScroll])

  const setModeExternal = useCallback(
    (next: Mode) => {
      vimMotionStateRef.current.pendingG = false
      setMode(next)
    },
    [setMode],
  )

  // Stable identity so composites can capture it in refs/effects; `mode` reads
  // live through the getter.
  const controllerRef = useRef<AskEditorController | null>(null)
  if (controllerRef.current === null) {
    controllerRef.current = {
      getText,
      setText,
      insertText,
      setCursorToEnd,
      submit,
      get mode() {
        return modeRef.current
      },
      setMode: setModeExternal,
    }
  }

  return {
    controller: controllerRef.current,
    editor: {
      multiline,
      defaultValue,
      placeholder,
      value,
      onInput: setValue,
      textareaRef,
      inputRef,
      mode,
      suspended,
      focused,
      scrollRevision,
      bumpScroll,
      onEditorKeyDown: preventCursorModeEditorInput,
      onEditorPaste: preventCursorModeEditorInput,
      submit,
      onMouseDown: handleMouseDown,
    },
  }
}
