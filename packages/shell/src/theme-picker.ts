import { useCallback, useRef } from "react"
import { createElement } from "react"
import { useThemeSwitcher } from "@tooee/themes"
import { useOverlay, useOverlayState } from "@tooee/overlays"
import type { OverlayCloseReason } from "@tooee/overlays"
import { ThemePickerOverlay } from "./ThemePickerOverlay.js"

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
  const { stack } = useOverlayState()
  const isOpen = stack.includes(OVERLAY_ID)
  const originalThemeRef = useRef<string>(currentTheme)

  const entries: ThemePickerEntry[] = allThemes.map((name: string) => ({
    id: name,
    title: name,
  }))

  const close = useCallback(() => {
    setTheme(originalThemeRef.current)
    overlay.hide(OVERLAY_ID)
  }, [setTheme, overlay])

  const confirm = useCallback(
    (name: string) => {
      setTheme(name, { persist: true })
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
    overlay.open(
      OVERLAY_ID,
      ({ close: closeOverlay }: { close: (reason?: OverlayCloseReason) => void }) =>
        createElement(ThemePickerOverlay, {
          originalTheme: currentTheme,
          close: () => closeOverlay(),
        }),
      null,
      {
        ownCommands: true,
        role: "modal",
        surfaceMode: "insert",
      },
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
