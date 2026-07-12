import type { SyntaxStyle } from "@opentui/core";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { resolveTheme } from "./types.js";
import type { ThemeJSON, ResolvedTheme } from "./types.js";
import { buildSyntaxStyle } from "./syntax-rules.js";

// ---------------------------------------------------------------------------
// Theme loading
// ---------------------------------------------------------------------------

export interface Theme {
  name: string;
  mode: "dark" | "light";
  colors: ResolvedTheme;
  syntax: SyntaxStyle;
}

/** Cache of loaded theme JSONs by name */
const themeJsonCache = new Map<string, ThemeJSON>();

const loadJsonThemesFromDir = function loadJsonThemesFromDir(
  dir: string,
  target: Map<string, ThemeJSON>,
) {
  try {
    if (!existsSync(dir)) {
      return;
    }
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const name = basename(file, ".json");
      try {
        const content = readFileSync(join(dir, file), "utf-8");
        target.set(name, JSON.parse(content) as ThemeJSON);
      } catch {
        // skip invalid files
      }
    }
  } catch {
    // dir not readable
  }
};

/** Load all bundled themes from packages/themes/themes/ */
const loadBundledThemes = function loadBundledThemes(): Map<string, ThemeJSON> {
  if (themeJsonCache.size > 0) {
    return themeJsonCache;
  }

  // Bundled themes
  const bundledDir = join(dirname(new URL(import.meta.url).pathname), "..", "themes");
  loadJsonThemesFromDir(bundledDir, themeJsonCache);

  // XDG config: ~/.config/tooee/themes/
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(process.env.HOME ?? "", ".config");
  loadJsonThemesFromDir(join(xdgConfig, "tooee", "themes"), themeJsonCache);

  // Project-local: search upward for .tooee/themes/
  let dir = process.cwd();
  const seen = new Set<string>();
  while (dir && !seen.has(dir)) {
    seen.add(dir);
    loadJsonThemesFromDir(join(dir, ".tooee", "themes"), themeJsonCache);
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return themeJsonCache;
};

export const loadThemes = function loadThemes(): Map<string, ThemeJSON> {
  return loadBundledThemes();
};

export const getThemeNames = function getThemeNames(): string[] {
  return [...loadThemes().keys()].toSorted();
};

// ---------------------------------------------------------------------------
// Default theme
// ---------------------------------------------------------------------------

export const DEFAULT_THEME_NAME = "tokyonight";
export const DEFAULT_MODE: "dark" | "light" = "dark";

export const buildTheme = function buildTheme(name: string, mode: "dark" | "light"): Theme {
  const themes = loadThemes();
  const json = themes.get(name);
  if (!json) {
    // Fall back to tokyonight, then first available, then hardcoded
    const fallbackJson = themes.get(DEFAULT_THEME_NAME) ?? themes.values().next().value;
    if (fallbackJson) {
      const resolved = resolveTheme(fallbackJson, mode);
      return { colors: resolved, mode, name, syntax: buildSyntaxStyle(resolved) };
    }
    // Absolute fallback — hardcoded Tokyo Night colors
    return hardcodedDefaultTheme;
  }
  try {
    const resolved = resolveTheme(json, mode);
    return { colors: resolved, mode, name, syntax: buildSyntaxStyle(resolved) };
  } catch {
    return hardcodedDefaultTheme;
  }
};

const hardcodedDefaultTheme: Theme = (() => {
  const colors: ResolvedTheme = {
    accent: "#7dcfff",
    background: "#1a1b26",
    backgroundElement: "#222436",
    backgroundPanel: "#1e2030",
    border: "#565f89",
    borderActive: "#737aa2",
    borderSubtle: "#414868",
    cursorLine: "#222436",
    diffAdded: "#4fd6be",
    diffAddedBg: "#20303b",
    diffAddedLineNumberBg: "#1b2b34",
    diffContext: "#828bb8",
    diffContextBg: "#1e2030",
    diffHighlightAdded: "#b8db87",
    diffHighlightRemoved: "#e26a75",
    diffHunkHeader: "#828bb8",
    diffLineNumber: "#222436",
    diffRemoved: "#c53b53",
    diffRemovedBg: "#37222c",
    diffRemovedLineNumberBg: "#2d1f26",
    error: "#f7768e",
    info: "#7aa2f7",
    markdownBlockQuote: "#e0af68",
    markdownCode: "#9ece6a",
    markdownCodeBlock: "#c0caf5",
    markdownEmph: "#e0af68",
    markdownHeading: "#bb9af7",
    markdownHorizontalRule: "#565f89",
    markdownImage: "#7aa2f7",
    markdownImageText: "#7dcfff",
    markdownLink: "#7aa2f7",
    markdownLinkText: "#7dcfff",
    markdownListEnumeration: "#7dcfff",
    markdownListItem: "#7aa2f7",
    markdownStrong: "#ff966c",
    markdownText: "#c0caf5",
    primary: "#7aa2f7",
    secondary: "#bb9af7",
    selection: "#1e2030",
    success: "#9ece6a",
    syntaxComment: "#565f89",
    syntaxFunction: "#7aa2f7",
    syntaxKeyword: "#bb9af7",
    syntaxNumber: "#ff9e64",
    syntaxOperator: "#89ddff",
    syntaxPunctuation: "#a9b1d6",
    syntaxString: "#9ece6a",
    syntaxType: "#2ac3de",
    syntaxVariable: "#c0caf5",
    text: "#c0caf5",
    textMuted: "#565f89",
    warning: "#e0af68",
  };
  return { colors, mode: DEFAULT_MODE, name: DEFAULT_THEME_NAME, syntax: buildSyntaxStyle(colors) };
})();

export const defaultTheme: Theme = hardcodedDefaultTheme;
