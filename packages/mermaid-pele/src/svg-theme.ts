/**
 * Map a Tooee theme to Pele's `--pele-*` CSS variables, then inline every
 * `var()` and `color-mix()` in a Pele SVG string.
 *
 * Pele colors its SVG through CSS custom properties. Browsers resolve them,
 * but resvg does not support custom properties, so every reference must be
 * replaced by a literal value before rasterizing.
 */

import type { ResolvedTheme } from "@tooee/themes";

/** Public Pele tokens, keyed by name without the leading `--`. */
export type PeleVariables = ReadonlyMap<string, string>;

const SERIES_COUNT = 8;

/** Pick Tooee theme colors for each public Pele token. */
export const peleVariablesFromTheme = function peleVariablesFromTheme(
  theme: ResolvedTheme,
  fontFamily: string,
  monoFamily: string
): PeleVariables {
  const series = [
    theme.accent,
    theme.success,
    theme.warning,
    theme.info,
    theme.error,
    theme.secondary,
    theme.primary,
    theme.syntaxFunction,
  ];

  const variables = new Map<string, string>([
    ["pele-accent", theme.accent],
    ["pele-bg", theme.backgroundElement],
    ["pele-border", theme.border],
    ["pele-critical", theme.error],
    ["pele-error", theme.error],
    ["pele-fg", theme.markdownText],
    ["pele-font", fontFamily],
    ["pele-font-mono", monoFamily],
    ["pele-line", theme.textMuted],
    ["pele-muted", theme.textMuted],
    ["pele-radius", "4px"],
    ["pele-surface", theme.backgroundPanel],
    ["pele-surface-alt", theme.borderSubtle],
  ]);

  for (let index = 0; index < SERIES_COUNT; index += 1) {
    variables.set(`pele-series-${index + 1}`, series[index] ?? theme.accent);
  }

  return variables;
};

// `--name: value` declarations inside a style attribute or <style> block.
const DECLARATION = /--(?<name>[\w-]+)\s*:\s*(?<value>[^;"]+)/gu;

// Innermost var() only: its arguments contain no parentheses.
const VAR_CALL = /var\(\s*--(?<name>[\w-]+)\s*(?:,(?<fallback>[^()]*))?\)/gu;

const COLOR_MIX =
  /color-mix\(\s*in srgb\s*,\s*(?<first>#[\da-f]{3,8})\s+(?<percent>[\d.]+)%\s*,\s*(?<second>#[\da-f]{3,8})\s*\)/giu;

// A custom property declaration, removed after inlining so resvg never sees it.
const DECLARATION_STRIP = /--[\w-]+\s*:\s*[^;"]+;?/gu;

const MAX_PASSES = 8;

const expandHex = function expandHex(hex: string): [number, number, number] {
  let digits = hex.slice(1);

  if (digits.length === 3 || digits.length === 4) {
    digits = digits.slice(0, 3).replaceAll(/./gu, (digit) => digit + digit);
  }

  return [
    Number.parseInt(digits.slice(0, 2), 16),
    Number.parseInt(digits.slice(2, 4), 16),
    Number.parseInt(digits.slice(4, 6), 16),
  ];
};

const toHex = function toHex(channel: number): string {
  return Math.round(Math.min(255, Math.max(0, channel)))
    .toString(16)
    .padStart(2, "0");
};

/** Resolve `color-mix(in srgb, #a P%, #b)` once both colors are literal hex. */
const mixColors = function mixColors(first: string, percent: number, second: string): string {
  const weight = percent / 100;
  const a = expandHex(first);
  const b = expandHex(second);
  const mixed = a.map((channel, index) => channel * weight + (b[index] ?? 0) * (1 - weight));

  return `#${mixed.map(toHex).join("")}`;
};

/**
 * Replace every `var(--x, fallback)` and `color-mix()` in `svg` with a
 * literal value. Pele's private tokens (`--_bg` and others) are declared on
 * the root element and refer to the public `--pele-*` tokens, so the private
 * declarations are read from the SVG and resolved against `variables`.
 */
export const inlineCssVariables = function inlineCssVariables(
  svg: string,
  variables: PeleVariables
): string {
  const scope = new Map<string, string>(variables);

  for (const match of svg.matchAll(DECLARATION)) {
    const name = match.groups?.name;
    const value = match.groups?.value?.trim();

    if (name !== undefined && value !== undefined && !scope.has(name)) {
      scope.set(name, value);
    }
  }

  const resolveCalls = (text: string): string =>
    text.replaceAll(VAR_CALL, (_whole, name: string, fallback: string | undefined) => {
      const value = scope.get(name);

      return value ?? fallback?.trim() ?? "";
    });

  // Private tokens may refer to public tokens, so resolve the scope first.
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let changed = false;

    for (const [name, value] of scope) {
      const resolved = resolveCalls(value);

      if (resolved !== value) {
        scope.set(name, resolved);
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  let output = svg.replaceAll(DECLARATION_STRIP, "");

  for (let pass = 0; pass < MAX_PASSES && output.includes("var("); pass += 1) {
    output = resolveCalls(output);
  }

  return output.replaceAll(COLOR_MIX, (_whole, first: string, percent: string, second: string) =>
    mixColors(first, Number(percent), second)
  );
};
