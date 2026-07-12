import { useCallback, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import type { ResolvedTheme } from "@tooee/themes";
import type { MouseEvent, SyntaxStyle, TextBufferRenderable } from "@opentui/core";
import type { Tokens } from "marked";
import { renderMermaidForTerminal } from "./mermaid.js";

// ---------------------------------------------------------------------------
// Public custom code block renderer API
// ---------------------------------------------------------------------------

/**
 * Extract the fence type from a fence info string: the first
 * whitespace-separated word, lowercased. Returns "" for bare fences.
 * Matches common Markdown behavior (marked may include extra info-string
 * content after the language).
 */
export function getFenceType(info?: string): string {
  return (info ?? "").trim().split(/\s+/u)[0]?.toLowerCase() ?? "";
}

/**
 * Opt-in horizontal panning hooks for wide block content. Attach `register`
 * as a ref and `onMouseScroll` as the `onMouseScroll` handler on the block's
 * text-buffer renderable (`<text>` or `<code>`, usually with
 * `wrapMode="none"`) to get the same panning behavior as built-in code and
 * mermaid blocks: h/l in cursor mode and shift+wheel pan via `scrollX`.
 */
export interface CodeBlockHScroll {
  register: (node: TextBufferRenderable | null) => void;
  onMouseScroll: (event: MouseEvent) => void;
}

export interface CodeBlockRendererProps {
  /** Fence body text. */
  text: string;
  /**
   * Matched fence type: the first whitespace-separated word of the fence
   * info string, lowercased ("" for bare fences).
   */
  lang: string;
  /** Full raw fence info string ("" when absent), for renderer options. */
  info: string;
  theme: ResolvedTheme;
  syntax: SyntaxStyle;
  /** Left indentation (columns) when the block is nested inside a list. */
  indent: number;
  /** Index of this block in the flattened block list. */
  blockIndex: number;
  /** Horizontal panning hooks for wide content (optional to use). */
  hScroll: CodeBlockHScroll;
}

/**
 * Renders a fenced code block for a registered fence type.
 *
 * Renderers draw their own chrome; wrap output in `CodeBlockChrome` to get
 * the standard bordered-box styling. Return `null` (or throw) to fall back
 * to the default syntax-highlighted code block — prefer returning `null`
 * from an explicit failure check (see the mermaid renderer) over throwing.
 *
 * Renderers are invoked as plain functions during render (the same contract
 * as `ContentRenderer` in `@tooee/view`), so hooks are allowed but the
 * renderer registered for a given fence type must call the same hooks on
 * every render.
 */
export type CodeBlockRenderer = (props: CodeBlockRendererProps) => ReactNode;

/**
 * The standard bordered-box chrome used by built-in code and mermaid blocks.
 * Custom renderers can wrap their content in this to match the default look.
 */
export function CodeBlockChrome({
  theme,
  indent,
  children,
}: {
  theme: ResolvedTheme;
  indent: number;
  children?: ReactNode;
}) {
  return (
    <box
      style={{
        marginTop: 0,
        marginBottom: 1,
        marginLeft: 1 + indent,
        marginRight: 1,
        border: true,
        borderColor: theme.border,
        backgroundColor: theme.backgroundElement,
        flexDirection: "column",
      }}
    >
      {children}
    </box>
  );
}

// ---------------------------------------------------------------------------
// Default renderer (syntax-highlighted code block)
// ---------------------------------------------------------------------------

/**
 * The default syntax-highlighted code block. Also used as the fallback when
 * a custom renderer returns `null` or throws.
 */
export const defaultCodeBlockRenderer: CodeBlockRenderer = ({
  text,
  info,
  theme,
  syntax,
  indent,
  hScroll,
}) => {
  const lineCount = text.split("\n").length;
  // Code lines never wrap (wrapMode "none") — wide code blocks and ASCII
  // diagrams pan horizontally via the renderable's own viewport (`scrollX`)
  // instead of word-wrapping into an unreadable mess. Blocks that fit render
  // exactly as before, with scrollX clamped to 0.
  return (
    <CodeBlockChrome theme={theme} indent={indent}>
      <code
        ref={hScroll.register}
        content={text}
        filetype={info}
        syntaxStyle={syntax}
        wrapMode="none"
        onMouseScroll={hScroll.onMouseScroll}
        style={{ height: lineCount }}
      />
    </CodeBlockChrome>
  );
};

// ---------------------------------------------------------------------------
// Built-in mermaid renderer
// ---------------------------------------------------------------------------

/**
 * Built-in renderer for ```mermaid fences: renders the diagram as styled
 * terminal text. Falls back to the default code block (returns `null`) when
 * the diagram cannot be rendered. Registered by default under "mermaid";
 * user entries for "mermaid" override it.
 */
export const mermaidCodeBlockRenderer: CodeBlockRenderer = ({ text, theme, indent, hScroll }) => {
  const mermaidTheme = {
    accent: theme.accent,
    arrow: theme.accent,
    bg: theme.backgroundElement,
    border: theme.border,
    corner: theme.borderActive,
    fg: theme.markdownText,
    junction: theme.borderSubtle,
    line: theme.textMuted,
  };
  const result = renderMermaidForTerminal(text, { mode: "ansi", theme: mermaidTheme });

  if (!result.ok) {
    return null;
  }

  const lineCount = result.text.split("\n").length;
  // Diagram lines never wrap (wrapMode "none"). Wide diagrams pan via the
  // text renderable's own viewport (`scrollX`), which the native renderer
  // clips with correct style-run alignment. Translating a natural-width text
  // inside a nested scrollbox instead exercises the scissor-clip path, which
  // misplaces fg colors at some offsets (each fully clipped style chunk after
  // the first bleeds a phantom column into view). Diagrams that fit render
  // exactly as before, with scrollX clamped to 0.
  return (
    <CodeBlockChrome theme={theme} indent={indent}>
      <text
        ref={hScroll.register}
        content={result.content}
        wrapMode="none"
        onMouseScroll={hScroll.onMouseScroll}
        style={{ fg: theme.markdownText, height: lineCount }}
      />
    </CodeBlockChrome>
  );
};

/** Built-in code block renderers, merged under user-provided entries. */
export const DEFAULT_CODE_BLOCK_RENDERERS: Record<string, CodeBlockRenderer> = {
  mermaid: mermaidCodeBlockRenderer,
};

// ---------------------------------------------------------------------------
// Horizontal panning registration
// ---------------------------------------------------------------------------

/**
 * Registration and shift+wheel panning for a horizontally scrollable block.
 *
 * `register` is a React ref callback that (de)registers the block's
 * text-buffer renderable in the `hScrollableBlocksRef` registry under its
 * block index, so the owning subview can pan the block under the nav cursor.
 *
 * `handleMouseScroll` remaps shift+vertical-wheel to horizontal panning
 * (ScrollBox does this remap; the text-buffer renderable's built-in scroll
 * handling only pans on real horizontal wheel directions). The event is not
 * stopped, so plain vertical wheel keeps bubbling to the surrounding
 * row-document.
 */
function useHScrollableBlock(
  blockIndex: number,
  hScrollableBlocksRef?: RefObject<Map<number, TextBufferRenderable>>,
) {
  const nodeRef = useRef<TextBufferRenderable | null>(null);
  const register = useCallback(
    (node: TextBufferRenderable | null) => {
      nodeRef.current = node;
      const map = hScrollableBlocksRef?.current;
      if (!map) return;
      if (node) map.set(blockIndex, node);
      else map.delete(blockIndex);
    },
    [hScrollableBlocksRef, blockIndex],
  );

  const handleMouseScroll = useCallback((event: MouseEvent) => {
    const node = nodeRef.current;
    if (!node || !event.scroll || !event.modifiers.shift) return;
    const { direction, delta } = event.scroll;
    if (direction === "up") node.scrollX -= delta;
    else if (direction === "down") node.scrollX += delta;
  }, []);

  return { register, handleMouseScroll };
}

// ---------------------------------------------------------------------------
// Dispatching block component
// ---------------------------------------------------------------------------

/**
 * Renders a fenced code block, dispatching to a registered custom renderer
 * for the fence type when one exists, and falling back to the default
 * syntax-highlighted code block when there is no match, the renderer
 * returns `null`, or the renderer throws.
 */
export function CodeBlock({
  token,
  blockIndex,
  theme,
  syntax,
  indent,
  hScrollableBlocksRef,
  renderers,
}: {
  token: Tokens.Code;
  blockIndex: number;
  theme: ResolvedTheme;
  syntax: SyntaxStyle;
  indent: number;
  hScrollableBlocksRef?: RefObject<Map<number, TextBufferRenderable>>;
  renderers?: Record<string, CodeBlockRenderer>;
}): ReactNode {
  const { register, handleMouseScroll } = useHScrollableBlock(blockIndex, hScrollableBlocksRef);

  const rendererProps: CodeBlockRendererProps = {
    text: token.text,
    lang: getFenceType(token.lang),
    info: token.lang ?? "",
    theme,
    syntax,
    indent,
    blockIndex,
    hScroll: { register, onMouseScroll: handleMouseScroll },
  };

  const custom = rendererProps.lang === "" ? undefined : renderers?.[rendererProps.lang];
  if (custom && custom !== defaultCodeBlockRenderer) {
    // Keyed by fence type so a type change remounts the custom renderer
    // (renderers may use hooks; see CodeBlockRenderer docs).
    return (
      <CustomCodeBlock key={rendererProps.lang} renderer={custom} rendererProps={rendererProps} />
    );
  }

  return defaultCodeBlockRenderer(rendererProps);
}

/**
 * Invokes a custom renderer, falling back to the default code block when it
 * returns `null` or throws. Isolated in its own component so renderer hooks
 * have a stable home that remounts when the fence type changes.
 */
function CustomCodeBlock({
  renderer,
  rendererProps,
}: {
  renderer: CodeBlockRenderer;
  rendererProps: CodeBlockRendererProps;
}): ReactNode {
  let node: ReactNode = null;
  try {
    node = renderer(rendererProps);
  } catch {
    node = null;
  }
  return node ?? defaultCodeBlockRenderer(rendererProps);
}
