import { createContext, useContext, type ReactNode } from "react"
import { RGBA, SyntaxStyle } from "@opentui/core"

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
    <ThemeContext.Provider value={theme ?? defaultTheme}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): Theme {
  return useContext(ThemeContext)
}

let _defaultSyntaxStyle: SyntaxStyle | undefined

export function getDefaultSyntaxStyle(): SyntaxStyle {
  if (!_defaultSyntaxStyle) {
    _defaultSyntaxStyle = SyntaxStyle.fromStyles({
      keyword: { fg: RGBA.fromHex("#bb9af7"), bold: true },
      string: { fg: RGBA.fromHex("#9ece6a") },
      comment: { fg: RGBA.fromHex("#565f89"), italic: true },
      number: { fg: RGBA.fromHex("#ff9e64") },
      function: { fg: RGBA.fromHex("#7aa2f7") },
      operator: { fg: RGBA.fromHex("#89ddff") },
      type: { fg: RGBA.fromHex("#2ac3de") },
      variable: { fg: RGBA.fromHex("#c0caf5") },
      punctuation: { fg: RGBA.fromHex("#a9b1d6") },
      default: { fg: RGBA.fromHex("#c0caf5") },
    })
  }
  return _defaultSyntaxStyle
}
