import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"
import { type SyntaxStyle } from "@opentui/core"
import { writeGlobalConfig } from "@tooee/config"
import type { ResolvedTheme } from "./types.js"
import {
  type Theme,
  buildTheme,
  getThemeNames,
  defaultTheme,
  DEFAULT_THEME_NAME,
  DEFAULT_MODE,
} from "./loader.js"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  theme: ResolvedTheme
  syntax: SyntaxStyle
  name: string
  mode: "dark" | "light"
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme.colors,
  syntax: defaultTheme.syntax,
  name: defaultTheme.name,
  mode: defaultTheme.mode,
})

export interface ThemeProviderProps {
  /** Theme name (e.g. "tokyonight", "catppuccin", "dracula") */
  name?: string
  /** Color mode */
  mode?: "dark" | "light"
  /** Full Theme object (overrides name/mode if provided) */
  theme?: Theme
  children: ReactNode
}

export function ThemeProvider({ name, mode, theme: themeProp, children }: ThemeProviderProps) {
  const resolved = useMemo<ThemeContextValue>(() => {
    if (themeProp) {
      return {
        theme: themeProp.colors,
        syntax: themeProp.syntax,
        name: themeProp.name,
        mode: themeProp.mode,
      }
    }

    const t = buildTheme(name ?? DEFAULT_THEME_NAME, mode ?? DEFAULT_MODE)
    return { theme: t.colors, syntax: t.syntax, name: t.name, mode: t.mode }
  }, [themeProp, name, mode])

  return <ThemeContext.Provider value={resolved}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

// ---------------------------------------------------------------------------
// ThemeSwitcherProvider + useThemeSwitcher
// ---------------------------------------------------------------------------

interface ThemeSwitcherContextValue extends ThemeContextValue {
  nextTheme: () => void
  prevTheme: () => void
  setTheme: (name: string, opts?: { persist?: boolean }) => void
  allThemes: string[]
}

const ThemeSwitcherContext = createContext<ThemeSwitcherContextValue | null>(null)

export interface ThemeSwitcherProviderProps {
  initialTheme?: string
  initialMode?: "dark" | "light"
  children: ReactNode
}

export function ThemeSwitcherProvider({
  initialTheme,
  initialMode,
  children,
}: ThemeSwitcherProviderProps) {
  const allThemes = useMemo(() => getThemeNames(), [])
  const [themeName, setThemeName] = useState(initialTheme ?? DEFAULT_THEME_NAME)
  const [mode, _setMode] = useState<"dark" | "light">(initialMode ?? DEFAULT_MODE)

  const theme = useMemo(() => buildTheme(themeName, mode), [themeName, mode])

  const nextTheme = useCallback(() => {
    const idx = allThemes.indexOf(themeName)
    const next = allThemes[(idx + 1) % allThemes.length]
    setThemeName(next)
    writeGlobalConfig({ theme: { name: next, mode } })
  }, [allThemes, mode, themeName])

  const prevTheme = useCallback(() => {
    const idx = allThemes.indexOf(themeName)
    const prev = allThemes[(idx - 1 + allThemes.length) % allThemes.length]
    setThemeName(prev)
    writeGlobalConfig({ theme: { name: prev, mode } })
  }, [allThemes, mode, themeName])

  const setThemeByName = useCallback(
    (name: string, opts?: { persist?: boolean }) => {
      setThemeName(name)
      if (opts?.persist) {
        writeGlobalConfig({ theme: { name, mode } })
      }
    },
    [mode],
  )

  const value = useMemo<ThemeSwitcherContextValue>(
    () => ({
      theme: theme.colors,
      syntax: theme.syntax,
      name: theme.name,
      mode,
      nextTheme,
      prevTheme,
      setTheme: setThemeByName,
      allThemes,
    }),
    [theme, mode, nextTheme, prevTheme, setThemeByName, allThemes],
  )

  const themeValue = useMemo<ThemeContextValue>(
    () => ({ theme: theme.colors, syntax: theme.syntax, name: theme.name, mode }),
    [theme, mode],
  )

  return (
    <ThemeSwitcherContext.Provider value={value}>
      <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>
    </ThemeSwitcherContext.Provider>
  )
}

export function useThemeSwitcher(): ThemeSwitcherContextValue {
  const ctx = useContext(ThemeSwitcherContext)
  if (!ctx) throw new Error("useThemeSwitcher must be used within ThemeSwitcherProvider")
  return ctx
}
