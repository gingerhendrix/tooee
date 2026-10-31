// Keep highlight surfaces visibly apart from the surface they sit on.
//
// Distances are ΔEOK: Euclidean distance in Oklab (Björn Ottosson, 2020,
// https://bottosson.github.io/posts/oklab/). About 0.02 is one just-noticeable
// difference.

import { parseHex, toRgbHex } from "./color-mix.js";
import type { Rgba } from "./color-mix.js";

interface Oklab {
  L: number;
  a: number;
  b: number;
}

/** Extra lightness added per retry when gamut clipping eats into the target distance. */
const LIGHTNESS_STEP = 0.004;

/** Retries per direction before trying the other direction. */
const MAX_STEPS = 40;

/** Below this lightness gap the highlight has no direction of its own. */
const SAME_LIGHTNESS = 0.005;

const toLinear = function toLinear(channel: number): number {
  const c = channel / 255;

  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const fromLinear = function fromLinear(value: number): number {
  const c = Math.min(1, Math.max(0, value));

  return 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
};

const toOklab = function toOklab(color: Rgba): Oklab {
  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
};

/** Convert Oklab to opaque 8-bit sRGB, clipping each channel to the sRGB gamut. */
const fromOklab = function fromOklab(color: Oklab): Rgba {
  const l = (color.L + 0.3963377774 * color.a + 0.2158037573 * color.b) ** 3;
  const m = (color.L - 0.1055613458 * color.a - 0.0638541728 * color.b) ** 3;
  const s = (color.L - 0.0894841775 * color.a - 1.291485548 * color.b) ** 3;

  return {
    a: 255,
    b: fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    g: fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    r: fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
  };
};

const distance = function distance(x: Oklab, y: Oklab): number {
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b);
};

/** Opaque colours only: alpha blending makes the rendered distance unknown here. */
const parseOpaque = function parseOpaque(hex: string): Rgba | null {
  const color = parseHex(hex);

  return color !== null && color.a === 255 ? color : null;
};

/**
 * ΔEOK between two opaque hex colours, or `null` when either is translucent or
 * cannot be parsed.
 */
export const deltaEOK = function deltaEOK(x: string, y: string): number | null {
  const from = parseOpaque(x);
  const to = parseOpaque(y);

  return from === null || to === null ? null : distance(toOklab(from), toOklab(to));
};

/** Move `highlight` to lightness `lightness`, keeping its Oklab a and b (hue and chroma). */
const withLightness = function withLightness(highlight: Oklab, lightness: number): string {
  return toRgbHex(fromOklab({ ...highlight, L: lightness }));
};

const searchDirection = function searchDirection(
  highlight: Oklab,
  base: Oklab,
  minDelta: number,
  direction: 1 | -1
): string | null {
  const hueGap = Math.hypot(highlight.a - base.a, highlight.b - base.b);
  const lightnessGap = Math.sqrt(Math.max(0, minDelta ** 2 - hueGap ** 2));

  for (let step = 0; step <= MAX_STEPS; step += 1) {
    const lightness = base.L + direction * (lightnessGap + step * LIGHTNESS_STEP);

    if (lightness < 0 || lightness > 1) {
      return null;
    }

    const candidate = withLightness(highlight, lightness);
    const rendered = parseOpaque(candidate);

    if (rendered !== null && distance(toOklab(rendered), base) >= minDelta) {
      return candidate;
    }
  }

  return null;
};

export type Side = 1 | -1;

/**
 * The side of `base` that `highlight` is on: 1 for lighter, -1 for darker, or
 * `null` when they share a lightness or either is translucent.
 */
export const lightnessSide = function lightnessSide(highlight: string, base: string): Side | null {
  const from = parseOpaque(highlight);
  const to = parseOpaque(base);

  if (from === null || to === null) {
    return null;
  }

  const gap = toOklab(from).L - toOklab(to).L;

  if (Math.abs(gap) < SAME_LIGHTNESS) {
    return null;
  }

  return gap > 0 ? 1 : -1;
};

/**
 * Return `highlight`, moved in Oklab lightness only as far as needed to sit at
 * least `minDelta` ΔEOK from `base`.
 *
 * A highlight that is already far enough away is returned unchanged. Otherwise
 * it moves to the `prefer` side of the base. Without `prefer`, a highlight that
 * is lighter or darker than its base keeps that side, and one at the base's
 * lightness becomes lighter on a dark base and darker on a light base. When
 * that side runs out of gamut the other side is tried. Translucent or
 * unparsable colours are returned unchanged.
 */
export const separateFrom = function separateFrom(
  highlight: string,
  base: string,
  minDelta: number,
  prefer?: Side | null
): string {
  const highlightRgb = parseOpaque(highlight);
  const baseRgb = parseOpaque(base);

  if (highlightRgb === null || baseRgb === null) {
    return highlight;
  }

  const from = toOklab(highlightRgb);
  const to = toOklab(baseRgb);

  if (distance(from, to) >= minDelta) {
    return highlight;
  }

  const side: Side = prefer ?? lightnessSide(highlight, base) ?? (to.L < 0.5 ? 1 : -1);

  return (
    searchDirection(from, to, minDelta, side) ??
    searchDirection(from, to, minDelta, side === 1 ? -1 : 1) ??
    highlight
  );
};

export interface SurfaceStack {
  background: string;
  backgroundPanel: string;
  backgroundElement: string;
}

/**
 * Keep panels apart from the page and elements apart from panels.
 *
 * The element keeps the side of the panel the theme put it on. An element that
 * equals the panel starts from the moved panel. When the theme gives it no side, it follows the panel's final step away from the page, so an
 * active row stays lighter than its panel on a theme whose panels are lighter
 * than the page.
 */
export const separateSurfaces = function separateSurfaces(
  surfaces: SurfaceStack,
  minDelta: number
): SurfaceStack {
  const { background, backgroundElement, backgroundPanel } = surfaces;
  const panel = separateFrom(backgroundPanel, background, minDelta);

  const elementSide =
    lightnessSide(backgroundElement, backgroundPanel) ?? lightnessSide(panel, background);

  // A theme that reuses the panel colour for elements means "the panel, one step on".
  const element =
    backgroundElement.toLowerCase() === backgroundPanel.toLowerCase() ? panel : backgroundElement;

  return {
    background,
    backgroundElement: separateFrom(element, panel, minDelta, elementSide),
    backgroundPanel: panel,
  };
};
