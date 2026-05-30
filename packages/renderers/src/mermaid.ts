import { renderMermaidASCII } from "beautiful-mermaid"

export type MermaidRenderResult =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "render-error"; message: string }

/**
 * Marked may include extra info-string content after the language. Treat only
 * the first word as the fence language, matching common Markdown behavior.
 */
export function isMermaidFence(lang?: string): boolean {
  return (lang ?? "").trim().split(/\s+/)[0]?.toLowerCase() === "mermaid"
}

/**
 * Render Mermaid source for terminal display. This wrapper keeps third-party
 * parser/layout failures out of React render paths so MarkdownView can fall
 * back to the original source block.
 */
export function renderMermaidForTerminal(source: string): MermaidRenderResult {
  if (source.trim().length === 0) {
    return { ok: false, reason: "empty", message: "Mermaid block is empty" }
  }

  try {
    const rendered = renderMermaidASCII(source, { colorMode: "none" }).trimEnd()

    if (rendered.trim().length === 0) {
      return { ok: false, reason: "empty", message: "Mermaid renderer returned no output" }
    }

    return { ok: true, text: rendered }
  } catch (error) {
    return {
      ok: false,
      reason: "render-error",
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
