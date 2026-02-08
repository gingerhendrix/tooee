import { useCallback, useRef, useState } from "react"
import { createElement } from "react"
import { useThemeSwitcher, useOverlay } from "@tooee/react"
import { ThemePickerOverlay } from "./ThemePickerOverlay.tsx"

export interface ThemePickerEntry {
  id: string
  title: string
}

export interface ThemePickerState {
  isOpen: boolean
  open: () => void
  close: () => void
  confirm: (name: string) => void
  preview: (name: string) => void
  entries: ThemePickerEntry[]
  originalTheme: string
  currentTheme: string
}

const OVERLAY_ID = "theme-picker"

export function useThemePicker(): ThemePickerState {
  const { allThemes, setTheme, name: currentTheme } = useThemeSwitcher()
  const overlay = useOverlay()
  const [isOpen, setIsOpen] = useState(false)
  const originalThemeRef = useRef<string>(currentTheme)

  const entries: ThemePickerEntry[] = allThemes.map((name) => ({
    id: name,
    title: name,
  }))

  const close = useCallback(() => {
    setTheme(originalThemeRef.current)
    setIsOpen(false)
    overlay.hide(OVERLAY_ID)
  }, [setTheme, overlay])

  const confirm = useCallback(
    (name: string) => {
      setTheme(name)
      setIsOpen(false)
      overlay.hide(OVERLAY_ID)
    },
    [setTheme, overlay],
  )

  const preview = useCallback(
    (name: string) => {
      setTheme(name)
    },
    [setTheme],
  )

  const open = useCallback(() => {
    originalThemeRef.current = currentTheme
    setIsOpen(true)
    overlay.open(
      OVERLAY_ID,
      ({ close }) =>
        createElement(ThemePickerOverlay, {
          originalTheme: currentTheme,
          close: () => close(),
        }),
      null,
      { mode: "insert", dismissOnEscape: true, onClose: () => setIsOpen(false) },
    )
  }, [overlay, currentTheme])

  return {
    isOpen,
    open,
    close,
    confirm,
    preview,
    entries,
    originalTheme: originalThemeRef.current,
    currentTheme,
  }
}
