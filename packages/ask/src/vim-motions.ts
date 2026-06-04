import type { InputRenderable, KeyEvent, TextareaRenderable } from "@opentui/core"

type EditableMotionTarget = Pick<
  InputRenderable | TextareaRenderable,
  | "moveCursorLeft"
  | "moveCursorRight"
  | "moveCursorUp"
  | "moveCursorDown"
  | "gotoLineHome"
  | "gotoLineEnd"
  | "gotoBufferHome"
  | "gotoBufferEnd"
  | "moveWordForward"
  | "moveWordBackward"
>

export type EditableInsertTarget = Pick<
  InputRenderable | TextareaRenderable,
  "cursorOffset" | "insertText" | "moveCursorRight" | "plainText"
>

export interface VimMotionState {
  pendingG: boolean
}

export function appendAtCursor(target: EditableInsertTarget | null | undefined): void {
  target?.moveCursorRight()
}

export function openLineAtCursor(
  target: EditableInsertTarget | null | undefined,
  position: "above" | "below",
): void {
  if (!target) return

  const text = target.plainText
  const cursorOffset = target.cursorOffset
  const currentLineStart = text.lastIndexOf("\n", Math.max(0, cursorOffset - 1)) + 1
  const currentLineEndIndex = text.indexOf("\n", cursorOffset)
  const currentLineEnd = currentLineEndIndex === -1 ? text.length : currentLineEndIndex

  if (position === "above") {
    target.cursorOffset = currentLineStart
    target.insertText("\n")
    target.cursorOffset = currentLineStart
    return
  }

  target.cursorOffset = currentLineEnd
  target.insertText("\n")
}

function consume(key: KeyEvent): true {
  key.preventDefault()
  return true
}

function isPlainKey(key: KeyEvent, name: string): boolean {
  return (
    !key.ctrl &&
    !key.meta &&
    !key.option &&
    (key.name === name || key.raw === name) &&
    (!key.shift || key.raw === name)
  )
}

export function handleEditBufferVimMotion(
  key: KeyEvent,
  target: EditableMotionTarget | null | undefined,
  state: VimMotionState,
): boolean {
  if (!target || key.ctrl || key.meta || key.option) {
    state.pendingG = false
    return false
  }

  if (state.pendingG) {
    state.pendingG = false
    if (isPlainKey(key, "g")) {
      target.gotoBufferHome()
      return consume(key)
    }
  }

  if (isPlainKey(key, "h") || key.name === "left") {
    target.moveCursorLeft()
    return consume(key)
  }
  if (isPlainKey(key, "l") || key.name === "right") {
    target.moveCursorRight()
    return consume(key)
  }
  if (isPlainKey(key, "j") || key.name === "down") {
    target.moveCursorDown()
    return consume(key)
  }
  if (isPlainKey(key, "k") || key.name === "up") {
    target.moveCursorUp()
    return consume(key)
  }
  if (isPlainKey(key, "0") || key.name === "home") {
    target.gotoLineHome()
    return consume(key)
  }
  if (isPlainKey(key, "$") || key.name === "end") {
    target.gotoLineEnd()
    return consume(key)
  }
  if (isPlainKey(key, "w")) {
    target.moveWordForward()
    return consume(key)
  }
  if (isPlainKey(key, "b")) {
    target.moveWordBackward()
    return consume(key)
  }
  if ((key.name === "g" && key.shift) || key.raw === "G") {
    target.gotoBufferEnd()
    return consume(key)
  }
  if (isPlainKey(key, "g")) {
    state.pendingG = true
    return consume(key)
  }

  return false
}
