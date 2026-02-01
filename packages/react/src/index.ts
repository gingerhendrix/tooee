// Components
export { MarkdownView } from "./components/MarkdownView.tsx"
export { CodeView } from "./components/CodeView.tsx"
export { StatusBar } from "./components/StatusBar.tsx"
export type { StatusBarItem } from "./components/StatusBar.tsx"
export { TitleBar } from "./components/TitleBar.tsx"

// Hooks
export { useVimNavigation } from "./hooks/use-vim-navigation.ts"
export type { VimNavigationOptions, VimNavigationState } from "./hooks/use-vim-navigation.ts"
export { useSelection } from "./hooks/use-selection.ts"
export type { SelectionOptions, SelectionState } from "./hooks/use-selection.ts"

// Theme
export {
  ThemeProvider,
  ThemeSwitcherProvider,
  useTheme,
  useThemeSwitcher,
  defaultTheme,
  getDefaultSyntaxStyle,
  resolveTheme,
  buildSyntaxStyle,
  loadThemes,
  getThemeNames,
} from "./theme.tsx"
export type { Theme, ThemeJSON, ResolvedTheme, ThemeProviderProps, ThemeSwitcherProviderProps } from "./theme.tsx"

// Clipboard
export { copyToClipboard, readClipboard, readClipboardText } from "./clipboard.ts"
export type { ClipboardContent } from "./clipboard.ts"
