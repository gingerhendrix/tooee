import { createContext, useContext, type ReactNode } from "react"

export interface SyntaxTheme {
  keyword: string
  string: string
  comment: string
  function: string
  number: string
  operator: string
}

export interface Theme {
  name: string
  colors: {
    primary: string
    secondary: string
    background: string
    foreground: string
    muted: string
    accent: string
    error: string
    warning: string
    success: string
  }
  syntax: SyntaxTheme
  border: "single" | "double" | "rounded" | "none"
}

export const defaultTheme: Theme = {
  name: "default",
  colors: {
    primary: "#7aa2f7",
    secondary: "#bb9af7",
    background: "#1a1b26",
    foreground: "#c0caf5",
    muted: "#565f89",
    accent: "#7dcfff",
    error: "#f7768e",
    warning: "#e0af68",
    success: "#9ece6a",
  },
  syntax: {
    keyword: "#bb9af7",
    string: "#9ece6a",
    comment: "#565f89",
    function: "#7aa2f7",
    number: "#ff9e64",
    operator: "#89ddff",
  },
  border: "single",
}

const ThemeContext = createContext<Theme>(defaultTheme)

export interface ThemeProviderProps {
  theme?: Theme
  children: ReactNode
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return (
    <ThemeContext value={theme ?? defaultTheme}>
      {children}
    </ThemeContext>
  )
}

export function useTheme(): Theme {
  return useContext(ThemeContext)
}
