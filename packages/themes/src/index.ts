export { resolveTheme } from "./types.js";
export type { ThemeJSON, ResolvedTheme } from "./types.js";

export { buildSyntaxStyle } from "./syntax-rules.js";

export { loadThemes, getThemeNames, defaultTheme } from "./loader.js";
export type { Theme } from "./loader.js";

export { ThemeProvider, ThemeSwitcherProvider, useTheme, useThemeSwitcher } from "./context.js";
export type { ThemeProviderProps, ThemeSwitcherProviderProps } from "./context.js";

export { ThemePicker } from "./theme-picker.js";
export type { ThemePickerEntry } from "./theme-picker.js";

export { CloseButton } from "./close-button.js";
