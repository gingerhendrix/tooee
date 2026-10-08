/**
 * termcn docs pages. The site serves a Markdown mirror of each MDX page. The
 * mirror keeps the MDX component tags and drops heading markers, so this
 * module turns it back into plain Markdown that Tooee's renderer can show.
 */

import type { ComponentEntry } from "./registry.js";
import { TERMCN_ORIGIN } from "./registry.js";

/**
 * Docs mirror URL for an entry, or null when termcn has no page for it.
 * Chart pages, including the dither charts filed under "data", live under
 * /docs/charts/ without the `-chart` suffix.
 */
export const docsUrl = function docsUrl(entry: ComponentEntry): string | null {
  const category = entry.name.startsWith("dither-") ? "charts" : entry.category;

  if (category === "core") {
    return null;
  }

  if (category === "charts") {
    return `${TERMCN_ORIGIN}/docs/charts/opentui/${entry.name.replace(/-chart$/u, "")}.md`;
  }

  if (category === "templates") {
    return `${TERMCN_ORIGIN}/docs/templates/opentui/${entry.name}.md`;
  }

  return `${TERMCN_ORIGIN}/docs/components/opentui/${entry.category}/${entry.name}.md`;
};

const PREVIEW_PATTERN = /<ComponentPreview\b[^>]*\bname="(?<name>[^"]+)"[^>]*\/>/gu;

/** Demo names in the order the docs page previews them. */
export const extractPreviewNames = function extractPreviewNames(markdown: string): string[] {
  return [
    ...new Set(Array.from(markdown.matchAll(PREVIEW_PATTERN), (match) => match.groups?.name ?? "")),
  ];
};

const attribute = function attribute(tag: string, name: string): string | null {
  return new RegExp(`\\b${name}="(?<value>[^"]*)"`, "u").exec(tag)?.groups?.value ?? null;
};

/** Labels for the install tabs; other tab values are capitalized. */
const TAB_LABELS: ReadonlyMap<string, string> = new Map([["cli", "Command"]]);

const tabLabel = function tabLabel(value: string): string {
  return TAB_LABELS.get(value) ?? value.charAt(0).toUpperCase() + value.slice(1);
};

/** Readable replacement for a self-closing MDX tag, or "" to drop it. */
const replaceSelfClosing = function replaceSelfClosing(tag: string): string {
  const name = /^<(?<tag>[A-Z]\w*)/u.exec(tag)?.groups?.tag;

  if (name === "ComponentPreview") {
    return `> Live demo \`${attribute(tag, "name") ?? "?"}\`: open the Preview tab to run it.`;
  }

  if (name === "ComponentSource") {
    const title = attribute(tag, "title") ?? attribute(tag, "src") ?? attribute(tag, "name");

    return title === null ? "" : `- \`${title}\``;
  }

  return "";
};

interface CleanState {
  output: string[];
  depth: number;
  fenceIndent: number | null;
  step: number;
  skipping: boolean;
}

const OPEN_TAG = /^<(?<tag>[A-Z]\w*)\b[^>]*(?<!\/)>$/u;

const CLOSE_TAG = /^<\/(?<tag>[A-Z]\w*)>$/u;

const SELF_CLOSING_TAG = /^<[A-Z]\w*\b[^>]*\/>$/u;

const HEADING_ANCHOR = /^(?<title>\S.*?)\s+\[#[\w-]+\]$/u;

/** Handle a line that is a whole JSX tag. Returns false when the line is not a tag. */
const handleTagLine = function handleTagLine(state: CleanState, trimmed: string): boolean {
  if (SELF_CLOSING_TAG.test(trimmed)) {
    const replacement = replaceSelfClosing(trimmed);

    if (replacement !== "" && !state.skipping) {
      state.output.push(replacement);
    }

    return true;
  }

  const open = OPEN_TAG.exec(trimmed);

  if (open !== null) {
    state.depth += 1;

    if (open.groups?.tag === "TabsList") {
      state.skipping = true;
    } else if (open.groups?.tag === "TabsContent") {
      state.output.push(`**${tabLabel(attribute(trimmed, "value") ?? "")}**`, "");
    } else if (open.groups?.tag === "Step") {
      state.step += 1;
      state.output.push(`${state.step}. `);
    } else if (open.groups?.tag === "Steps") {
      state.step = 0;
    }

    return true;
  }

  const close = CLOSE_TAG.exec(trimmed);

  if (close !== null) {
    state.depth = Math.max(0, state.depth - 1);

    if (close.groups?.tag === "TabsList") {
      state.skipping = false;
    }

    return true;
  }

  return false;
};

/** Append a text line, joining it to a pending `N. ` step marker. */
const pushText = function pushText(state: CleanState, text: string): void {
  const last = state.output.at(-1);

  if (last !== undefined && /^\d+\. $/u.test(last) && text !== "") {
    state.output[state.output.length - 1] = `${last}${text}`;

    return;
  }

  state.output.push(text);
};

const handleFenceLine = function handleFenceLine(
  state: CleanState,
  line: string,
  trimmed: string
): void {
  const indent = line.length - line.trimStart().length;

  if (state.fenceIndent === null) {
    state.fenceIndent = state.depth > 0 ? indent : 0;
  } else {
    state.fenceIndent = null;
  }

  pushText(state, trimmed.startsWith("```") ? line.slice(Math.min(indent, line.length)) : line);
};

const cleanLine = function cleanLine(state: CleanState, line: string): void {
  const trimmed = line.trim();

  if (trimmed.startsWith("```")) {
    handleFenceLine(state, line, trimmed);

    return;
  }

  if (state.fenceIndent !== null) {
    state.output.push(
      line.slice(Math.min(state.fenceIndent, line.length - line.trimStart().length))
    );

    return;
  }

  if (handleTagLine(state, trimmed) || state.skipping) {
    return;
  }

  const heading = HEADING_ANCHOR.exec(trimmed);

  if (heading !== null && state.depth === 0) {
    state.output.push(`## ${heading.groups?.title ?? ""}`);

    return;
  }

  pushText(state, state.depth > 0 ? trimmed : line);
};

/** Turn the termcn Markdown mirror into renderer-friendly Markdown. */
export const cleanDocsMarkdown = function cleanDocsMarkdown(markdown: string): string {
  const state: CleanState = { depth: 0, fenceIndent: null, output: [], skipping: false, step: 0 };

  for (const line of markdown.replaceAll("\r\n", "\n").split("\n")) {
    cleanLine(state, line);
  }

  return `${state.output
    .join("\n")
    .replaceAll(/\n{3,}/gu, "\n\n")
    .trim()}\n`;
};
