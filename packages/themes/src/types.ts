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
export const RESOLVED_KEYS: (keyof ResolvedTheme)[] = [
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
export const FALLBACKS: Record<string, string> = {
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
