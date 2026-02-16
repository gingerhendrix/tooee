export {
  ThemeProvider,
  ThemeSwitcherProvider,
  useTheme,
  useThemeSwitcher,
  defaultTheme,
  resolveTheme,
  buildSyntaxStyle,
  loadThemes,
  getThemeNames,
} from "./theme.js"
export type {
  Theme,
  ThemeJSON,
  ResolvedTheme,
  ThemeProviderProps,
  ThemeSwitcherProviderProps,
} from "./theme.js"

export { ThemePicker } from "./ThemePicker.js"
export type { ThemePickerEntry } from "./ThemePicker.js"
