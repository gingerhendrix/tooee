import type { SyntaxStyle } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import { writeGlobalConfig } from "@tooee/config";
import type { ColorMode } from "@tooee/config";
import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";

import {
  buildTheme,
  getThemeNames,
  defaultTheme,
  DEFAULT_THEME_NAME,
  DEFAULT_MODE,
} from "./loader.js";
import type { Theme } from "./loader.js";
import { buildSyntaxStyle } from "./syntax-rules.js";
import type { ResolvedTheme } from "./types.js";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  theme: ResolvedTheme;
  syntax: SyntaxStyle;
  name: string;
  mode: ColorMode;
}

/**
 * The provider value. `syntax` is null only in the default value: a
 * SyntaxStyle needs the renderer's native context, which does not exist at
 * module load in OpenTUI 0.6.
 */
interface ThemeContextState extends Omit<ThemeContextValue, "syntax"> {
  syntax: SyntaxStyle | null;
}

const ThemeContext = createContext<ThemeContextState>({
  mode: defaultTheme.mode,
  name: defaultTheme.name,
  syntax: null,
  theme: defaultTheme.colors,
});

/** Builds the theme's SyntaxStyle in the current renderer's native context. */
const useSyntaxStyle = function useSyntaxStyle(colors: ResolvedTheme): SyntaxStyle {
  const renderer = useRenderer();

  return useMemo(() => buildSyntaxStyle(colors, renderer.nativeScene), [colors, renderer]);
};

export interface ThemeProviderProps {
  /** Theme name (e.g. "tokyonight", "catppuccin", "dracula") */
  name?: string;
  /** Color mode */
  mode?: ColorMode;
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
  const base = useMemo<Theme>(
    () => themeProp ?? buildTheme(name ?? DEFAULT_THEME_NAME, mode ?? DEFAULT_MODE),
    [themeProp, name, mode]
  );

  const syntax = useSyntaxStyle(base.colors);

  const resolved = useMemo<ThemeContextValue>(
    () => ({ mode: base.mode, name: base.name, syntax, theme: base.colors }),
    [base, syntax]
  );

  return <ThemeContext.Provider value={resolved}>{children}</ThemeContext.Provider>;
};

export const useTheme = function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  const renderer = useRenderer();

  return useMemo(
    () => ({ ...ctx, syntax: ctx.syntax ?? buildSyntaxStyle(ctx.theme, renderer.nativeScene) }),
    [ctx, renderer]
  );
};

// ---------------------------------------------------------------------------
// ThemeSwitcherProvider + useThemeSwitcher
// ---------------------------------------------------------------------------

interface ThemeSwitcherContextValue extends ThemeContextValue {
  nextTheme: () => void;
  prevTheme: () => void;
  setTheme: (name: string, opts?: { persist?: boolean }) => void;
  /** Switch between the light and dark variants of the current theme. */
  setMode: (mode: ColorMode, opts?: { persist?: boolean }) => void;
  allThemes: string[];
}

const ThemeSwitcherContext = createContext<ThemeSwitcherContextValue | null>(null);

export interface ThemeSwitcherProviderProps {
  initialTheme?: string;
  initialMode?: ColorMode;
  children: ReactNode;
}

export const ThemeSwitcherProvider = function ThemeSwitcherProvider({
  initialTheme,
  initialMode,
  children,
}: ThemeSwitcherProviderProps): ReactNode {
  const allThemes = useMemo(() => getThemeNames(), []);
  const [themeName, setThemeName] = useState(initialTheme ?? DEFAULT_THEME_NAME);
  const [mode, setMode] = useState<ColorMode>(initialMode ?? DEFAULT_MODE);

  const theme = useMemo(() => buildTheme(themeName, mode), [themeName, mode]);
  const syntax = useSyntaxStyle(theme.colors);

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
    [mode]
  );

  const setModeByName = useCallback(
    (nextMode: ColorMode, opts?: { persist?: boolean }) => {
      setMode(nextMode);

      if (opts?.persist === true) {
        writeGlobalConfig({ theme: { mode: nextMode, name: themeName } });
      }
    },
    [themeName]
  );

  const value = useMemo<ThemeSwitcherContextValue>(
    () => ({
      allThemes,
      mode,
      name: theme.name,
      nextTheme,
      prevTheme,
      setMode: setModeByName,
      setTheme: setThemeByName,
      syntax,
      theme: theme.colors,
    }),
    [theme, syntax, mode, nextTheme, prevTheme, setModeByName, setThemeByName, allThemes]
  );

  const themeValue = useMemo<ThemeContextValue>(
    () => ({ mode, name: theme.name, syntax, theme: theme.colors }),
    [theme, syntax, mode]
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
