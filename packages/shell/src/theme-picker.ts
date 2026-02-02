import { useState, useCallback, useRef } from "react"
import { useCommand, useSetMode, useMode } from "@tooee/commands"
import { useThemeSwitcher } from "@tooee/react"
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

export function useThemePicker(): ThemePickerState {
  const [isOpen, setIsOpen] = useState(false)
  const { allThemes, setTheme, name: currentTheme } = useThemeSwitcher()
  const setMode = useSetMode()
  const mode = useMode()
  const originalThemeRef = useRef<string>(currentTheme)
  const launchModeRef = useRef<Mode>("command")

  const open = useCallback(() => {
    originalThemeRef.current = currentTheme
    launchModeRef.current = mode
    setIsOpen(true)
    setMode("insert")
  }, [currentTheme, setMode, mode])

  const close = useCallback(() => {
    setTheme(originalThemeRef.current)
    setIsOpen(false)
    setMode("command")
  }, [setTheme, setMode])

  const confirm = useCallback((name: string) => {
    setTheme(name)
    setIsOpen(false)
    setMode("command")
  }, [setTheme, setMode])

  const preview = useCallback((name: string) => {
    setTheme(name)
  }, [setTheme])

  const entries: ThemePickerEntry[] = allThemes.map((name) => ({
    id: name,
    title: name,
  }))

  return { isOpen, open, close, confirm, preview, entries, originalTheme: originalThemeRef.current, currentTheme }
}
