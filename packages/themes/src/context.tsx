import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import type { SyntaxStyle } from "@opentui/core";
import { writeGlobalConfig } from "@tooee/config";
import type { ResolvedTheme } from "./types.js";
import {
  buildTheme,
  getThemeNames,
  defaultTheme,
  DEFAULT_THEME_NAME,
  DEFAULT_MODE,
} from "./loader.js";
import type { Theme } from "./loader.js";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  theme: ResolvedTheme;
  syntax: SyntaxStyle;
  name: string;
  mode: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: defaultTheme.mode,
  name: defaultTheme.name,
  syntax: defaultTheme.syntax,
  theme: defaultTheme.colors,
});

export interface ThemeProviderProps {
  /** Theme name (e.g. "tokyonight", "catppuccin", "dracula") */
  name?: string;
  /** Color mode */
  mode?: "dark" | "light";
  /** Full Theme object (overrides name/mode if provided) */
  theme?: Theme;
  children: ReactNode;
}

export const ThemeProvider = function ThemeProvider({
  name,
  mode,
  theme: themeProp,
  children,
}: ThemeProviderProps): ReactNode {
  const resolved = useMemo<ThemeContextValue>(() => {
    if (themeProp) {
      return {
        mode: themeProp.mode,
        name: themeProp.name,
        syntax: themeProp.syntax,
        theme: themeProp.colors,
      };
    }

    const t = buildTheme(name ?? DEFAULT_THEME_NAME, mode ?? DEFAULT_MODE);
    return { mode: t.mode, name: t.name, syntax: t.syntax, theme: t.colors };
  }, [themeProp, name, mode]);

  return <ThemeContext.Provider value={resolved}>{children}</ThemeContext.Provider>;
};

export const useTheme = function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
};

// ---------------------------------------------------------------------------
// ThemeSwitcherProvider + useThemeSwitcher
// ---------------------------------------------------------------------------

interface ThemeSwitcherContextValue extends ThemeContextValue {
  nextTheme: () => void;
  prevTheme: () => void;
  setTheme: (name: string, opts?: { persist?: boolean }) => void;
  allThemes: string[];
}

const ThemeSwitcherContext = createContext<ThemeSwitcherContextValue | null>(null);

export interface ThemeSwitcherProviderProps {
  initialTheme?: string;
  initialMode?: "dark" | "light";
  children: ReactNode;
}

export const ThemeSwitcherProvider = function ThemeSwitcherProvider({
  initialTheme,
  initialMode,
  children,
}: ThemeSwitcherProviderProps): ReactNode {
  const allThemes = useMemo(() => getThemeNames(), []);
  const [themeName, setThemeName] = useState(initialTheme ?? DEFAULT_THEME_NAME);
  const [mode, _setMode] = useState<"dark" | "light">(initialMode ?? DEFAULT_MODE);

  const theme = useMemo(() => buildTheme(themeName, mode), [themeName, mode]);

  const nextTheme = useCallback(() => {
    const idx = allThemes.indexOf(themeName);
    const next = allThemes[(idx + 1) % allThemes.length];
    setThemeName(next);
    writeGlobalConfig({ theme: { mode, name: next } });
  }, [allThemes, mode, themeName]);

  const prevTheme = useCallback(() => {
    const idx = allThemes.indexOf(themeName);
    const prev = allThemes[(idx - 1 + allThemes.length) % allThemes.length];
    setThemeName(prev);
    writeGlobalConfig({ theme: { mode, name: prev } });
  }, [allThemes, mode, themeName]);

  const setThemeByName = useCallback(
    (name: string, opts?: { persist?: boolean }) => {
      setThemeName(name);
      if (opts?.persist === true) {
        writeGlobalConfig({ theme: { mode, name } });
      }
    },
    [mode],
  );

  const value = useMemo<ThemeSwitcherContextValue>(
    () => ({
      allThemes,
      mode,
      name: theme.name,
      nextTheme,
      prevTheme,
      setTheme: setThemeByName,
      syntax: theme.syntax,
      theme: theme.colors,
    }),
    [theme, mode, nextTheme, prevTheme, setThemeByName, allThemes],
  );

  const themeValue = useMemo<ThemeContextValue>(
    () => ({ mode, name: theme.name, syntax: theme.syntax, theme: theme.colors }),
    [theme, mode],
  );

  return (
    <ThemeSwitcherContext.Provider value={value}>
      <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>
    </ThemeSwitcherContext.Provider>
  );
};

export const useThemeSwitcher = function useThemeSwitcher(): ThemeSwitcherContextValue {
  const ctx = useContext(ThemeSwitcherContext);
  if (!ctx) {
    throw new Error("useThemeSwitcher must be used within ThemeSwitcherProvider");
  }
  return ctx;
};
