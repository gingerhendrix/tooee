import { type SyntaxStyle } from "@opentui/core"
import { readFileSync, readdirSync, existsSync } from "fs"
import { join, basename, dirname } from "path"
import { type ThemeJSON, type ResolvedTheme, resolveTheme } from "./types.js"
import { buildSyntaxStyle } from "./syntax-rules.js"

// ---------------------------------------------------------------------------
// Theme loading
// ---------------------------------------------------------------------------

export interface Theme {
  name: string
  mode: "dark" | "light"
  colors: ResolvedTheme
  syntax: SyntaxStyle
}

/** Cache of loaded theme JSONs by name */
const themeJsonCache = new Map<string, ThemeJSON>()

function loadJsonThemesFromDir(dir: string, target: Map<string, ThemeJSON>) {
  try {
    if (!existsSync(dir)) return
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".json")) continue
      const name = basename(file, ".json")
      try {
        const content = readFileSync(join(dir, file), "utf-8")
        target.set(name, JSON.parse(content) as ThemeJSON)
      } catch {
        // skip invalid files
      }
    }
  } catch {
    // dir not readable
  }
}

/** Load all bundled themes from packages/themes/themes/ */
function loadBundledThemes(): Map<string, ThemeJSON> {
  if (themeJsonCache.size > 0) return themeJsonCache

  // Bundled themes
  const bundledDir = join(dirname(new URL(import.meta.url).pathname), "..", "themes")
  loadJsonThemesFromDir(bundledDir, themeJsonCache)

  // XDG config: ~/.config/tooee/themes/
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(process.env.HOME ?? "", ".config")
  loadJsonThemesFromDir(join(xdgConfig, "tooee", "themes"), themeJsonCache)

  // Project-local: search upward for .tooee/themes/
  let dir = process.cwd()
  const seen = new Set<string>()
  while (dir && !seen.has(dir)) {
    seen.add(dir)
    loadJsonThemesFromDir(join(dir, ".tooee", "themes"), themeJsonCache)
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  return themeJsonCache
}

export function loadThemes(): Map<string, ThemeJSON> {
  return loadBundledThemes()
}

export function getThemeNames(): string[] {
  return Array.from(loadThemes().keys()).sort()
}

// ---------------------------------------------------------------------------
// Default theme
// ---------------------------------------------------------------------------

export const DEFAULT_THEME_NAME = "tokyonight"
export const DEFAULT_MODE: "dark" | "light" = "dark"

export function buildTheme(name: string, mode: "dark" | "light"): Theme {
  const themes = loadThemes()
  const json = themes.get(name)
  if (!json) {
    // Fall back to tokyonight, then first available, then hardcoded
    const fallbackJson = themes.get(DEFAULT_THEME_NAME) ?? themes.values().next().value
    if (fallbackJson) {
      const resolved = resolveTheme(fallbackJson, mode)
      return { name, mode, colors: resolved, syntax: buildSyntaxStyle(resolved) }
    }
    // Absolute fallback — hardcoded Tokyo Night colors
    return hardcodedDefaultTheme
  }
  const resolved = resolveTheme(json, mode)
  return { name, mode, colors: resolved, syntax: buildSyntaxStyle(resolved) }
}

const hardcodedDefaultTheme: Theme = (() => {
  const colors: ResolvedTheme = {
    primary: "#7aa2f7",
    secondary: "#bb9af7",
    accent: "#7dcfff",
    error: "#f7768e",
    warning: "#e0af68",
    success: "#9ece6a",
    info: "#7aa2f7",
    text: "#c0caf5",
    textMuted: "#565f89",
    background: "#1a1b26",
    backgroundPanel: "#1e2030",
    backgroundElement: "#222436",
    cursorLine: "#222436",
    selection: "#1e2030",
    border: "#565f89",
    borderActive: "#737aa2",
    borderSubtle: "#414868",
    diffAdded: "#4fd6be",
    diffRemoved: "#c53b53",
    diffContext: "#828bb8",
    diffHunkHeader: "#828bb8",
    diffHighlightAdded: "#b8db87",
    diffHighlightRemoved: "#e26a75",
    diffAddedBg: "#20303b",
    diffRemovedBg: "#37222c",
    diffContextBg: "#1e2030",
    diffLineNumber: "#222436",
    diffAddedLineNumberBg: "#1b2b34",
    diffRemovedLineNumberBg: "#2d1f26",
    markdownText: "#c0caf5",
    markdownHeading: "#bb9af7",
    markdownLink: "#7aa2f7",
    markdownLinkText: "#7dcfff",
    markdownCode: "#9ece6a",
    markdownBlockQuote: "#e0af68",
    markdownEmph: "#e0af68",
    markdownStrong: "#ff966c",
    markdownHorizontalRule: "#565f89",
    markdownListItem: "#7aa2f7",
    markdownListEnumeration: "#7dcfff",
    markdownImage: "#7aa2f7",
    markdownImageText: "#7dcfff",
    markdownCodeBlock: "#c0caf5",
    syntaxComment: "#565f89",
    syntaxKeyword: "#bb9af7",
    syntaxFunction: "#7aa2f7",
    syntaxVariable: "#c0caf5",
    syntaxString: "#9ece6a",
    syntaxNumber: "#ff9e64",
    syntaxType: "#2ac3de",
    syntaxOperator: "#89ddff",
    syntaxPunctuation: "#a9b1d6",
  }
  return { name: DEFAULT_THEME_NAME, mode: DEFAULT_MODE, colors, syntax: buildSyntaxStyle(colors) }
})()

export const defaultTheme: Theme = hardcodedDefaultTheme
