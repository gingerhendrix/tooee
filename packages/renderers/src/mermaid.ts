import { renderMermaidASCII } from "beautiful-mermaid";
import { parseColor, StyledText } from "@opentui/core";
import type { TextChunk } from "@opentui/core";

interface BeautifulMermaidAsciiTheme {
  fg?: string;
  border?: string;
  line?: string;
  arrow?: string;
  accent?: string;
  bg?: string;
  corner?: string;
  junction?: string;
}

export type MermaidRenderMode = "plain" | "ansi";

export type MermaidRenderResult =
  | { ok: true; text: string; content: StyledText }
  | { ok: false; reason: "empty" | "render-error"; message: string };

export interface MermaidRenderOptions {
  mode?: MermaidRenderMode;
  theme?: BeautifulMermaidAsciiTheme;
}

// oxlint-disable-next-line no-control-regex -- ANSI SGR sequences start with the ESC control character
const SGR_SEQUENCE = /\u001B\[(?<params>[0-9;]*)m/gu;

/**
 * Marked may include extra info-string content after the language. Treat only
 * the first word as the fence language, matching common Markdown behavior.
 */
export const isMermaidFence = function isMermaidFence(lang?: string): boolean {
  return (lang ?? "").trim().split(/\s+/u)[0]?.toLowerCase() === "mermaid";
};

const appendStyledChunk = function appendStyledChunk(
  chunks: TextChunk[],
  text: string,
  fg?: string,
) {
  if (text.length === 0) {
    return;
  }

  chunks.push({
    __isChunk: true,
    text,
    ...(fg !== undefined && fg !== "" ? { fg: parseColor(fg) } : {}),
  });
};

const sgrParams = function sgrParams(rawParams: string): number[] {
  if (rawParams === "") {
    return [0];
  }
  return rawParams.split(";").map((param) => (param === "" ? 0 : Number(param)));
};

const updateAnsiForeground = function updateAnsiForeground(
  params: number[],
  currentFg: string | undefined,
): string | undefined {
  let fg = currentFg;

  for (let i = 0; i < params.length; i += 1) {
    const param = params[i];

    if (param === 0 || param === 39) {
      fg = undefined;
      continue;
    }

    if (param === 38 && params[i + 1] === 2) {
      const r = params[i + 2];
      const g = params[i + 3];
      const b = params[i + 4];

      if (
        r !== null &&
        r !== undefined &&
        g !== null &&
        g !== undefined &&
        b !== null &&
        b !== undefined
      ) {
        fg = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
          .toString(16)
          .padStart(2, "0")}`;
        i += 4;
      }
    }
  }

  return fg;
};

/** Convert beautiful-mermaid truecolor ANSI output into OpenTUI StyledText. */
export const ansiToStyledText = function ansiToStyledText(input: string): {
  text: string;
  content: StyledText;
} {
  const chunks: TextChunk[] = [];
  let plainText = "";
  let cursor = 0;
  let currentFg: string | undefined;

  for (const match of input.matchAll(SGR_SEQUENCE)) {
    const index = match.index ?? 0;
    const literal = input.slice(cursor, index);
    appendStyledChunk(chunks, literal, currentFg);
    plainText += literal;

    currentFg = updateAnsiForeground(sgrParams(match.groups?.params ?? ""), currentFg);
    cursor = index + match[0].length;
  }

  const tail = input.slice(cursor);
  appendStyledChunk(chunks, tail, currentFg);
  plainText += tail;

  return { content: new StyledText(chunks), text: plainText };
};

/**
 * Render Mermaid source for terminal display. This wrapper keeps third-party
 * parser/layout failures out of React render paths so MarkdownView can fall
 * back to the original source block.
 */
export const renderMermaidForTerminal = function renderMermaidForTerminal(
  source: string,
  options: MermaidRenderOptions = {},
): MermaidRenderResult {
  if (source.trim().length === 0) {
    return { message: "Mermaid block is empty", ok: false, reason: "empty" };
  }

  try {
    const mode = options.mode ?? "plain";
    const rendered = renderMermaidASCII(source, {
      colorMode: mode === "ansi" ? "truecolor" : "none",
      theme: options.theme,
    }).trimEnd();
    const { text, content } = ansiToStyledText(rendered);

    if (text.trim().length === 0) {
      return { message: "Mermaid renderer returned no output", ok: false, reason: "empty" };
    }

    return { content, ok: true, text };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : String(error),
      ok: false,
      reason: "render-error",
    };
  }
};
