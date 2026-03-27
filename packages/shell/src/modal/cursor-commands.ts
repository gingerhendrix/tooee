import { useCommand } from "@tooee/commands"
import type { ModalCoreState } from "./index.js"

export function useCursorCommands(state: ModalCoreState): void {
  const { setCursor, clampCursor, cursorMax, isBlockMode, viewportHeight, multiSelect, setMode } =
    state

  useCommand({
    id: "cursor-down",
    title: "Cursor down",
    hotkey: "j",
    modes: ["cursor"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        return { line: clampCursor(c.line + 1), col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-toggle",
    title: "Toggle selection",
    hotkey: "tab",
    modes: ["cursor"],
    when: () => multiSelect,
    handler: () => {
      state.setToggledIndices((prev) => {
        const cursor = state.cursorRef.current
        if (!cursor) return prev
        const next = new Set(prev)
        const idx = cursor.line
        if (next.has(idx)) {
          next.delete(idx)
        } else {
          next.add(idx)
        }
        return next
      })
    },
  })

  useCommand({
    id: "cursor-toggle-up",
    title: "Toggle and move up",
    hotkey: "shift+tab",
    modes: ["cursor"],
    when: () => multiSelect,
    handler: () => {
      state.setToggledIndices((prev) => {
        const cursor = state.cursorRef.current
        if (!cursor) return prev
        const next = new Set(prev)
        const idx = cursor.line
        if (next.has(idx)) {
          next.delete(idx)
        } else {
          next.add(idx)
        }
        return next
      })
      setCursor((c) => {
        if (!c) return c
        return { line: clampCursor(c.line - 1), col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-up",
    title: "Cursor up",
    hotkey: "k",
    modes: ["cursor"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        return { line: clampCursor(c.line - 1), col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-half-down",
    title: "Cursor half page down",
    hotkey: "ctrl+d",
    modes: ["cursor"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const step = isBlockMode ? Math.floor(cursorMax / 4) || 1 : Math.floor(viewportHeight / 2)
        return { line: clampCursor(c.line + step), col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-half-up",
    title: "Cursor half page up",
    hotkey: "ctrl+u",
    modes: ["cursor"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const step = isBlockMode ? Math.floor(cursorMax / 4) || 1 : Math.floor(viewportHeight / 2)
        return { line: clampCursor(c.line - step), col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-top",
    title: "Cursor to top",
    hotkey: "g g",
    modes: ["cursor"],
    handler: () => {
      setCursor({ line: 0, col: 0 })
    },
  })

  useCommand({
    id: "cursor-bottom",
    title: "Cursor to bottom",
    hotkey: "shift+g",
    modes: ["cursor"],
    handler: () => {
      setCursor({ line: cursorMax, col: 0 })
    },
  })

  useCommand({
    id: "enter-select",
    title: "Enter select mode",
    hotkey: "v",
    modes: ["cursor"],
    handler: () => setMode("select"),
  })
}
