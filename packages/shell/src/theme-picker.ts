import { useState, useCallback, useRef } from "react"
import { createElement } from "react"
import { useSetMode, useMode } from "@tooee/commands"
import { useThemeSwitcher, ThemePicker, useOverlay } from "@tooee/react"
import type { Mode } from "@tooee/commands"

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
  const [isOpen, setIsOpen] = useState(false)
  const { allThemes, setTheme, name: currentTheme } = useThemeSwitcher()
  const setMode = useSetMode()
  const mode = useMode()
  const originalThemeRef = useRef<string>(currentTheme)
  const launchModeRef = useRef<Mode>("command")
  const overlay = useOverlay()

  const entries: ThemePickerEntry[] = allThemes.map((name) => ({
    id: name,
    title: name,
  }))

  const close = useCallback(() => {
    setTheme(originalThemeRef.current)
    setIsOpen(false)
    overlay.hide(OVERLAY_ID)
    setMode("command")
  }, [setTheme, setMode, overlay])

  const confirm = useCallback((name: string) => {
    setTheme(name)
    setIsOpen(false)
    overlay.hide(OVERLAY_ID)
    setMode("command")
  }, [setTheme, setMode, overlay])

  const preview = useCallback((name: string) => {
    setTheme(name)
  }, [setTheme])

  const open = useCallback(() => {
    originalThemeRef.current = currentTheme
    launchModeRef.current = mode
    setIsOpen(true)
    setMode("insert")
    overlay.show(
      OVERLAY_ID,
      createElement(ThemePicker, {
        entries,
        currentTheme,
        onSelect: (name: string) => {
          setTheme(name)
          setIsOpen(false)
          overlay.hide(OVERLAY_ID)
          setMode("command")
        },
        onClose: () => {
          setTheme(originalThemeRef.current)
          setIsOpen(false)
          overlay.hide(OVERLAY_ID)
          setMode("command")
        },
        onNavigate: (name: string) => {
          setTheme(name)
        },
      }),
    )
  }, [currentTheme, setMode, mode, overlay, entries, setTheme])

  return { isOpen, open, close, confirm, preview, entries, originalTheme: originalThemeRef.current, currentTheme }
}
