import { renderMermaidASCII } from "beautiful-mermaid"
import { parseColor, StyledText, type TextChunk } from "@opentui/core"

type BeautifulMermaidAsciiTheme = {
  fg?: string
  border?: string
  line?: string
  arrow?: string
  accent?: string
  bg?: string
  corner?: string
  junction?: string
}

export type MermaidRenderMode = "plain" | "ansi"

export type MermaidRenderResult =
  | { ok: true; text: string; content: StyledText }
  | { ok: false; reason: "empty" | "render-error"; message: string }

export interface MermaidRenderOptions {
  mode?: MermaidRenderMode
  theme?: BeautifulMermaidAsciiTheme
}

const SGR_SEQUENCE = new RegExp(String.raw`\u001B\[([0-9;]*)m`, "g")

/**
 * Marked may include extra info-string content after the language. Treat only
 * the first word as the fence language, matching common Markdown behavior.
 */
export function isMermaidFence(lang?: string): boolean {
  return (lang ?? "").trim().split(/\s+/)[0]?.toLowerCase() === "mermaid"
}

function appendStyledChunk(chunks: TextChunk[], text: string, fg?: string) {
  if (text.length === 0) return

  chunks.push({
    __isChunk: true,
    text,
    ...(fg ? { fg: parseColor(fg) } : {}),
  })
}

function sgrParams(rawParams: string): number[] {
  if (rawParams === "") return [0]
  return rawParams.split(";").map((param) => (param === "" ? 0 : Number(param)))
}

function updateAnsiForeground(params: number[], currentFg: string | undefined): string | undefined {
  let fg = currentFg

  for (let i = 0; i < params.length; i++) {
    const param = params[i]

    if (param === 0 || param === 39) {
      fg = undefined
      continue
    }

    if (param === 38 && params[i + 1] === 2) {
      const r = params[i + 2]
      const g = params[i + 3]
      const b = params[i + 4]

      if (r != null && g != null && b != null) {
        fg = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
          .toString(16)
          .padStart(2, "0")}`
        i += 4
      }
    }
  }

  return fg
}

/** Convert beautiful-mermaid truecolor ANSI output into OpenTUI StyledText. */
export function ansiToStyledText(input: string): { text: string; content: StyledText } {
  const chunks: TextChunk[] = []
  let plainText = ""
  let cursor = 0
  let currentFg: string | undefined

  for (const match of input.matchAll(SGR_SEQUENCE)) {
    const index = match.index ?? 0
    const literal = input.slice(cursor, index)
    appendStyledChunk(chunks, literal, currentFg)
    plainText += literal

    currentFg = updateAnsiForeground(sgrParams(match[1] ?? ""), currentFg)
    cursor = index + match[0].length
  }

  const tail = input.slice(cursor)
  appendStyledChunk(chunks, tail, currentFg)
  plainText += tail

  return { text: plainText, content: new StyledText(chunks) }
}

/**
 * Render Mermaid source for terminal display. This wrapper keeps third-party
 * parser/layout failures out of React render paths so MarkdownView can fall
 * back to the original source block.
 */
export function renderMermaidForTerminal(
  source: string,
  options: MermaidRenderOptions = {},
): MermaidRenderResult {
  if (source.trim().length === 0) {
    return { ok: false, reason: "empty", message: "Mermaid block is empty" }
  }

  try {
    const mode = options.mode ?? "plain"
    const rendered = renderMermaidASCII(source, {
      colorMode: mode === "ansi" ? "truecolor" : "none",
      theme: options.theme,
    }).trimEnd()
    const { text, content } = ansiToStyledText(rendered)

    if (text.trim().length === 0) {
      return { ok: false, reason: "empty", message: "Mermaid renderer returned no output" }
    }

    return { ok: true, text, content }
  } catch (error) {
    return {
      ok: false,
      reason: "render-error",
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
