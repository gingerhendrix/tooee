import { createElement } from "react"
import type { ReactNode } from "react"
import { useThemeSwitcher, ThemePicker } from "@tooee/themes"

export function ThemePickerOverlay({
  originalTheme,
  close,
}: {
  originalTheme: string
  close: () => void
}): ReactNode {
  const { allThemes, name: currentTheme, setTheme } = useThemeSwitcher()
  const entries = allThemes.map((name) => ({ id: name, title: name }))

  return createElement(ThemePicker, {
    entries,
    currentTheme,
    onNavigate: setTheme,
    onSelect: (name: string) => {
      setTheme(name)
      close()
    },
    onClose: () => {
      setTheme(originalTheme)
      close()
    },
  })
}
