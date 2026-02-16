import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { RGBA, SyntaxStyle } from "@opentui/core"
import { writeGlobalConfig } from "@tooee/config"
import { readFileSync, readdirSync, existsSync } from "fs"
import { join, basename, dirname } from "path"

// ---------------------------------------------------------------------------
// Theme JSON format (OpenCode-compatible)
// ---------------------------------------------------------------------------

type HexColor = `#${string}`
type RefName = string
type Variant = { dark: HexColor | RefName; light: HexColor | RefName }
type ColorValue = HexColor | RefName | Variant

export interface ThemeJSON {
  $schema?: string
  defs?: Record<string, HexColor | RefName>
  theme: Record<string, ColorValue>
}

// ---------------------------------------------------------------------------
// Resolved theme — all colors resolved to hex strings
// ---------------------------------------------------------------------------

export interface ResolvedTheme {
  // UI
  primary: string
  secondary: string
  accent: string
  error: string
  warning: string
  success: string
  info: string
  text: string
  textMuted: string
  background: string
  backgroundPanel: string
  backgroundElement: string
  border: string
  borderActive: string
  borderSubtle: string
  // Diff
  diffAdded: string
  diffRemoved: string
  diffContext: string
  diffHunkHeader: string
  diffHighlightAdded: string
  diffHighlightRemoved: string
  diffAddedBg: string
  diffRemovedBg: string
  diffContextBg: string
  diffLineNumber: string
  diffAddedLineNumberBg: string
  diffRemovedLineNumberBg: string
  // Markdown
  markdownText: string
  markdownHeading: string
  markdownLink: string
  markdownLinkText: string
  markdownCode: string
  markdownBlockQuote: string
  markdownEmph: string
  markdownStrong: string
  markdownHorizontalRule: string
  markdownListItem: string
  markdownListEnumeration: string
  markdownImage: string
  markdownImageText: string
  markdownCodeBlock: string
  // Cursor/Selection
  cursorLine: string
  selection: string
  // Syntax
  syntaxComment: string
  syntaxKeyword: string
  syntaxFunction: string
  syntaxVariable: string
  syntaxString: string
  syntaxNumber: string
  syntaxType: string
  syntaxOperator: string
  syntaxPunctuation: string
}

// All keys of ResolvedTheme for iteration
const RESOLVED_KEYS: (keyof ResolvedTheme)[] = [
  "primary",
  "secondary",
  "accent",
  "error",
  "warning",
  "success",
  "info",
  "text",
  "textMuted",
  "background",
  "backgroundPanel",
  "backgroundElement",
  "border",
  "borderActive",
  "borderSubtle",
  "cursorLine",
  "selection",
  "diffAdded",
  "diffRemoved",
  "diffContext",
  "diffHunkHeader",
  "diffHighlightAdded",
  "diffHighlightRemoved",
  "diffAddedBg",
  "diffRemovedBg",
  "diffContextBg",
  "diffLineNumber",
  "diffAddedLineNumberBg",
  "diffRemovedLineNumberBg",
  "markdownText",
  "markdownHeading",
  "markdownLink",
  "markdownLinkText",
  "markdownCode",
  "markdownBlockQuote",
  "markdownEmph",
  "markdownStrong",
  "markdownHorizontalRule",
  "markdownListItem",
  "markdownListEnumeration",
  "markdownImage",
  "markdownImageText",
  "markdownCodeBlock",
  "syntaxComment",
  "syntaxKeyword",
  "syntaxFunction",
  "syntaxVariable",
  "syntaxString",
  "syntaxNumber",
  "syntaxType",
  "syntaxOperator",
  "syntaxPunctuation",
]

// Fallbacks used when a theme key is missing
const FALLBACKS: Record<string, string> = {
  primary: "#808080",
  secondary: "#808080",
  accent: "#808080",
  error: "#808080",
  warning: "#808080",
  success: "#808080",
  info: "#808080",
  text: "#d4d4d4",
  textMuted: "#808080",
  background: "#1e1e1e",
  backgroundPanel: "#1e1e1e",
  backgroundElement: "#1e1e1e",
  cursorLine: "#1e1e1e",
  selection: "#1e1e1e",
  border: "#808080",
  borderActive: "#808080",
  borderSubtle: "#808080",
  diffAdded: "#4fd6be",
  diffRemoved: "#c53b53",
  diffContext: "#808080",
  diffHunkHeader: "#808080",
  diffHighlightAdded: "#4fd6be",
  diffHighlightRemoved: "#c53b53",
  diffAddedBg: "#1e3a1e",
  diffRemovedBg: "#3a1e1e",
  diffContextBg: "#1e1e1e",
  diffLineNumber: "#808080",
  diffAddedLineNumberBg: "#1e3a1e",
  diffRemovedLineNumberBg: "#3a1e1e",
  markdownText: "#d4d4d4",
  markdownHeading: "#808080",
  markdownLink: "#808080",
  markdownLinkText: "#808080",
  markdownCode: "#808080",
  markdownBlockQuote: "#808080",
  markdownEmph: "#808080",
  markdownStrong: "#808080",
  markdownHorizontalRule: "#808080",
  markdownListItem: "#808080",
  markdownListEnumeration: "#808080",
  markdownImage: "#808080",
  markdownImageText: "#808080",
  markdownCodeBlock: "#d4d4d4",
  syntaxComment: "#808080",
  syntaxKeyword: "#808080",
  syntaxFunction: "#808080",
  syntaxVariable: "#808080",
  syntaxString: "#808080",
  syntaxNumber: "#808080",
  syntaxType: "#808080",
  syntaxOperator: "#808080",
  syntaxPunctuation: "#808080",
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export function resolveTheme(json: ThemeJSON, mode: "dark" | "light"): ResolvedTheme {
  const defs = json.defs ?? {}

  function resolveColor(c: ColorValue): string {
    if (typeof c === "string") {
      if (c === "transparent" || c === "none") return "#00000000"
      if (c.startsWith("#")) return c
      if (defs[c] != null) return resolveColor(defs[c] as ColorValue)
      if (json.theme[c] !== undefined) return resolveColor(json.theme[c] as ColorValue)
      return "#808080"
    }
    return resolveColor(c[mode])
  }

  const result = {} as Record<string, string>
  for (const key of RESOLVED_KEYS) {
    const val = json.theme[key]
    result[key] = val !== undefined ? resolveColor(val) : (FALLBACKS[key] ?? "#808080")
  }
  // Dynamic fallbacks that reference other resolved keys
  if (json.theme["cursorLine"] === undefined) result.cursorLine = result.backgroundElement
  if (json.theme["selection"] === undefined) result.selection = result.backgroundPanel
  return result as unknown as ResolvedTheme
}

// ---------------------------------------------------------------------------
// SyntaxStyle builder
// ---------------------------------------------------------------------------

function getSyntaxRules(resolved: ResolvedTheme) {
  return [
    { scope: ["default"], style: { foreground: RGBA.fromHex(resolved.text) } },
    { scope: ["prompt"], style: { foreground: RGBA.fromHex(resolved.accent) } },
    {
      scope: ["comment", "comment.documentation"],
      style: { foreground: RGBA.fromHex(resolved.syntaxComment), italic: true },
    },
    { scope: ["string", "symbol"], style: { foreground: RGBA.fromHex(resolved.syntaxString) } },
    { scope: ["number", "boolean"], style: { foreground: RGBA.fromHex(resolved.syntaxNumber) } },
    { scope: ["character.special"], style: { foreground: RGBA.fromHex(resolved.syntaxString) } },
    {
      scope: ["keyword.return", "keyword.conditional", "keyword.repeat", "keyword.coroutine"],
      style: { foreground: RGBA.fromHex(resolved.syntaxKeyword), italic: true },
    },
    {
      scope: ["keyword.type"],
      style: { foreground: RGBA.fromHex(resolved.syntaxType), bold: true, italic: true },
    },
    {
      scope: ["keyword.function", "function.method"],
      style: { foreground: RGBA.fromHex(resolved.syntaxFunction) },
    },
    {
      scope: ["keyword"],
      style: { foreground: RGBA.fromHex(resolved.syntaxKeyword), italic: true },
    },
    { scope: ["keyword.import"], style: { foreground: RGBA.fromHex(resolved.syntaxKeyword) } },
    {
      scope: ["operator", "keyword.operator", "punctuation.delimiter"],
      style: { foreground: RGBA.fromHex(resolved.syntaxOperator) },
    },
    {
      scope: ["keyword.conditional.ternary"],
      style: { foreground: RGBA.fromHex(resolved.syntaxOperator) },
    },
    {
      scope: ["variable", "variable.parameter", "function.method.call", "function.call"],
      style: { foreground: RGBA.fromHex(resolved.syntaxVariable) },
    },
    {
      scope: ["variable.member", "function", "constructor"],
      style: { foreground: RGBA.fromHex(resolved.syntaxFunction) },
    },
    { scope: ["type", "module"], style: { foreground: RGBA.fromHex(resolved.syntaxType) } },
    { scope: ["constant"], style: { foreground: RGBA.fromHex(resolved.syntaxNumber) } },
    { scope: ["property"], style: { foreground: RGBA.fromHex(resolved.syntaxVariable) } },
    { scope: ["class"], style: { foreground: RGBA.fromHex(resolved.syntaxType) } },
    { scope: ["parameter"], style: { foreground: RGBA.fromHex(resolved.syntaxVariable) } },
    {
      scope: ["punctuation", "punctuation.bracket"],
      style: { foreground: RGBA.fromHex(resolved.syntaxPunctuation) },
    },
    {
      scope: [
        "variable.builtin",
        "type.builtin",
        "function.builtin",
        "module.builtin",
        "constant.builtin",
      ],
      style: { foreground: RGBA.fromHex(resolved.error) },
    },
    { scope: ["variable.super"], style: { foreground: RGBA.fromHex(resolved.error) } },
    {
      scope: ["string.escape", "string.regexp"],
      style: { foreground: RGBA.fromHex(resolved.syntaxKeyword) },
    },
    {
      scope: ["keyword.directive"],
      style: { foreground: RGBA.fromHex(resolved.syntaxKeyword), italic: true },
    },
    {
      scope: ["punctuation.special"],
      style: { foreground: RGBA.fromHex(resolved.syntaxOperator) },
    },
    {
      scope: ["keyword.modifier"],
      style: { foreground: RGBA.fromHex(resolved.syntaxKeyword), italic: true },
    },
    {
      scope: ["keyword.exception"],
      style: { foreground: RGBA.fromHex(resolved.syntaxKeyword), italic: true },
    },
    // Markdown
    {
      scope: [
        "markup.heading",
        "markup.heading.1",
        "markup.heading.2",
        "markup.heading.3",
        "markup.heading.4",
        "markup.heading.5",
        "markup.heading.6",
      ],
      style: { foreground: RGBA.fromHex(resolved.markdownHeading), bold: true },
    },
    {
      scope: ["markup.bold", "markup.strong"],
      style: { foreground: RGBA.fromHex(resolved.markdownStrong), bold: true },
    },
    {
      scope: ["markup.italic"],
      style: { foreground: RGBA.fromHex(resolved.markdownEmph), italic: true },
    },
    { scope: ["markup.list"], style: { foreground: RGBA.fromHex(resolved.markdownListItem) } },
    {
      scope: ["markup.quote"],
      style: { foreground: RGBA.fromHex(resolved.markdownBlockQuote), italic: true },
    },
    {
      scope: ["markup.raw", "markup.raw.block"],
      style: { foreground: RGBA.fromHex(resolved.markdownCode) },
    },
    {
      scope: ["markup.raw.inline"],
      style: {
        foreground: RGBA.fromHex(resolved.markdownCode),
        background: RGBA.fromHex(resolved.background),
      },
    },
    {
      scope: ["markup.link"],
      style: { foreground: RGBA.fromHex(resolved.markdownLink), underline: true },
    },
    {
      scope: ["markup.link.label"],
      style: { foreground: RGBA.fromHex(resolved.markdownLinkText), underline: true },
    },
    {
      scope: ["markup.link.url"],
      style: { foreground: RGBA.fromHex(resolved.markdownLink), underline: true },
    },
    { scope: ["label"], style: { foreground: RGBA.fromHex(resolved.markdownLinkText) } },
    { scope: ["spell", "nospell"], style: { foreground: RGBA.fromHex(resolved.text) } },
    { scope: ["conceal"], style: { foreground: RGBA.fromHex(resolved.textMuted) } },
    {
      scope: ["string.special", "string.special.url"],
      style: { foreground: RGBA.fromHex(resolved.markdownLink), underline: true },
    },
    { scope: ["character"], style: { foreground: RGBA.fromHex(resolved.syntaxString) } },
    { scope: ["float"], style: { foreground: RGBA.fromHex(resolved.syntaxNumber) } },
    {
      scope: ["comment.error"],
      style: { foreground: RGBA.fromHex(resolved.error), italic: true, bold: true },
    },
    {
      scope: ["comment.warning"],
      style: { foreground: RGBA.fromHex(resolved.warning), italic: true, bold: true },
    },
    {
      scope: ["comment.todo", "comment.note"],
      style: { foreground: RGBA.fromHex(resolved.info), italic: true, bold: true },
    },
    { scope: ["namespace"], style: { foreground: RGBA.fromHex(resolved.syntaxType) } },
    { scope: ["field"], style: { foreground: RGBA.fromHex(resolved.syntaxVariable) } },
    {
      scope: ["type.definition"],
      style: { foreground: RGBA.fromHex(resolved.syntaxType), bold: true },
    },
    { scope: ["keyword.export"], style: { foreground: RGBA.fromHex(resolved.syntaxKeyword) } },
    { scope: ["attribute", "annotation"], style: { foreground: RGBA.fromHex(resolved.warning) } },
    { scope: ["tag"], style: { foreground: RGBA.fromHex(resolved.error) } },
    { scope: ["tag.attribute"], style: { foreground: RGBA.fromHex(resolved.syntaxKeyword) } },
    { scope: ["tag.delimiter"], style: { foreground: RGBA.fromHex(resolved.syntaxOperator) } },
    { scope: ["markup.strikethrough"], style: { foreground: RGBA.fromHex(resolved.textMuted) } },
    {
      scope: ["markup.underline"],
      style: { foreground: RGBA.fromHex(resolved.text), underline: true },
    },
    { scope: ["markup.list.checked"], style: { foreground: RGBA.fromHex(resolved.success) } },
    { scope: ["markup.list.unchecked"], style: { foreground: RGBA.fromHex(resolved.textMuted) } },
    {
      scope: ["diff.plus"],
      style: {
        foreground: RGBA.fromHex(resolved.diffAdded),
        background: RGBA.fromHex(resolved.diffAddedBg),
      },
    },
    {
      scope: ["diff.minus"],
      style: {
        foreground: RGBA.fromHex(resolved.diffRemoved),
        background: RGBA.fromHex(resolved.diffRemovedBg),
      },
    },
    {
      scope: ["diff.delta"],
      style: {
        foreground: RGBA.fromHex(resolved.diffContext),
        background: RGBA.fromHex(resolved.diffContextBg),
      },
    },
    { scope: ["error"], style: { foreground: RGBA.fromHex(resolved.error), bold: true } },
    { scope: ["warning"], style: { foreground: RGBA.fromHex(resolved.warning), bold: true } },
    { scope: ["info"], style: { foreground: RGBA.fromHex(resolved.info) } },
    { scope: ["debug"], style: { foreground: RGBA.fromHex(resolved.textMuted) } },
  ]
}

export function buildSyntaxStyle(resolved: ResolvedTheme): SyntaxStyle {
  return SyntaxStyle.fromTheme(getSyntaxRules(resolved))
}

// ---------------------------------------------------------------------------
// Theme loading
// ---------------------------------------------------------------------------

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

export interface Theme {
  name: string
  mode: "dark" | "light"
  colors: ResolvedTheme
  syntax: SyntaxStyle
}

// ---------------------------------------------------------------------------
// Default theme
// ---------------------------------------------------------------------------

const DEFAULT_THEME_NAME = "tokyonight"
const DEFAULT_MODE: "dark" | "light" = "dark"

function buildTheme(name: string, mode: "dark" | "light"): Theme {
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
  const resolved = themeProp
    ? {
        theme: themeProp.colors,
        syntax: themeProp.syntax,
        name: themeProp.name,
        mode: themeProp.mode,
      }
    : (() => {
        const t = buildTheme(name ?? DEFAULT_THEME_NAME, mode ?? DEFAULT_MODE)
        return { theme: t.colors, syntax: t.syntax, name: t.name, mode: t.mode }
      })()

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
  setTheme: (name: string) => void
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
  const allThemes = getThemeNames()
  const [themeName, setThemeName] = useState(initialTheme ?? DEFAULT_THEME_NAME)
  const [mode, _setMode] = useState<"dark" | "light">(initialMode ?? DEFAULT_MODE)

  const theme = buildTheme(themeName, mode)

  const nextTheme = useCallback(() => {
    setThemeName((current) => {
      const idx = allThemes.indexOf(current)
      const next = allThemes[(idx + 1) % allThemes.length]
      return next
    })
  }, [allThemes])

  const prevTheme = useCallback(() => {
    setThemeName((current) => {
      const idx = allThemes.indexOf(current)
      const prev = allThemes[(idx - 1 + allThemes.length) % allThemes.length]
      return prev
    })
  }, [allThemes])

  const setThemeByName = useCallback((name: string) => {
    setThemeName(name)
  }, [])

  // Persist when theme changes (but not on initial load)
  const isInitial = useRef(true)
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false
      return
    }
    writeGlobalConfig({ theme: { name: themeName, mode } })
  }, [themeName, mode])

  const value: ThemeSwitcherContextValue = {
    theme: theme.colors,
    syntax: theme.syntax,
    name: theme.name,
    mode,
    nextTheme,
    prevTheme,
    setTheme: setThemeByName,
    allThemes,
  }

  return (
    <ThemeSwitcherContext.Provider value={value}>
      <ThemeContext.Provider
        value={{ theme: theme.colors, syntax: theme.syntax, name: theme.name, mode }}
      >
        {children}
      </ThemeContext.Provider>
    </ThemeSwitcherContext.Provider>
  )
}

export function useThemeSwitcher(): ThemeSwitcherContextValue {
  const ctx = useContext(ThemeSwitcherContext)
  if (!ctx) throw new Error("useThemeSwitcher must be used within ThemeSwitcherProvider")
  return ctx
}
