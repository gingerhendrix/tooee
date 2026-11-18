/**
 * Rasterize an SVG string to PNG bytes with resvg.
 *
 * Pele measures text with packed Arial metrics. Liberation Sans is
 * metric-compatible with Arial, so it is the first choice for labels, then
 * Arial itself. Font files are loaded explicitly, because loading every
 * system font costs far more than the render itself. When no known font
 * file exists, resvg loads the system fonts instead.
 */

import { existsSync } from "node:fs";

import { Resvg } from "@resvg/resvg-js";

export interface RasterizedSvg {
  png: Uint8Array;
  /** Pixel size of the PNG. */
  width: number;
  height: number;
  /** Size of the SVG in CSS pixels, before `scale`. */
  svgWidth: number;
  svgHeight: number;
  /** Wall time of the resvg parse, render, and PNG encode, in milliseconds. */
  ms: number;
}

export interface RasterFonts {
  /** Font files for resvg. An empty list makes resvg load the system fonts. */
  files: readonly string[];
  /** Family used for `sans-serif` and for text with no family. */
  sansFamily?: string;
  /** Family used for `monospace`. */
  monoFamily?: string;
}

export interface RasterizeOptions {
  /** Pixel density multiplier over the SVG's own size. Default 2. */
  scale?: number;
  /** Background color painted under the diagram. */
  background?: string;
  /** Fonts for labels. Default: the first known fonts found on disk. */
  fonts?: RasterFonts;
  /**
   * Largest PNG pixel count. When `scale` would exceed it, the scale drops
   * so the PNG holds at most this many pixels. Default: no limit.
   */
  maxPixels?: number;
}

interface FontCandidate {
  family: string;
  files: readonly string[];
}

const SANS_CANDIDATES: readonly FontCandidate[] = [
  {
    family: "Liberation Sans",
    files: [
      "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
      "/usr/share/fonts/liberation/LiberationSans-Bold.ttf",
      "/usr/share/fonts/liberation/LiberationSans-Italic.ttf",
      "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
      "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
      "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
    ],
  },
  {
    family: "Arial",
    files: [
      "/System/Library/Fonts/Supplemental/Arial.ttf",
      "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
      "/System/Library/Fonts/Supplemental/Arial Italic.ttf",
      "/Library/Fonts/Arial.ttf",
    ],
  },
  {
    family: "DejaVu Sans",
    files: [
      "/usr/share/fonts/TTF/DejaVuSans.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
  },
];

const MONO_CANDIDATES: readonly FontCandidate[] = [
  {
    family: "Liberation Mono",
    files: [
      "/usr/share/fonts/liberation/LiberationMono-Regular.ttf",
      "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
    ],
  },
  {
    family: "Courier New",
    files: ["/System/Library/Fonts/Supplemental/Courier New.ttf"],
  },
  {
    family: "DejaVu Sans Mono",
    files: [
      "/usr/share/fonts/TTF/DejaVuSansMono.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ],
  },
];

const firstPresent = function firstPresent(
  candidates: readonly FontCandidate[],
  exists: (file: string) => boolean
): FontCandidate | undefined {
  for (const candidate of candidates) {
    const files = candidate.files.filter((file) => exists(file));

    if (files.length > 0) {
      return { family: candidate.family, files };
    }
  }

  return undefined;
};

/** Pick the first known sans and mono fonts that exist on disk. */
export const findRasterFonts = function findRasterFonts(
  exists: (file: string) => boolean = existsSync
): RasterFonts {
  const sans = firstPresent(SANS_CANDIDATES, exists);
  const mono = firstPresent(MONO_CANDIDATES, exists);

  return {
    files: [...(sans?.files ?? []), ...(mono?.files ?? [])],
    monoFamily: mono?.family,
    sansFamily: sans?.family,
  };
};

let detectedFonts: RasterFonts | undefined;

const defaultFonts = function defaultFonts(): RasterFonts {
  detectedFonts ??= findRasterFonts();

  return detectedFonts;
};

const createResvg = function createResvg(
  svg: string,
  scale: number,
  fonts: RasterFonts,
  background: string | undefined
): Resvg {
  return new Resvg(svg, {
    background,
    fitTo: { mode: "zoom", value: scale },
    font: {
      defaultFontFamily: fonts.sansFamily,
      fontFiles: [...fonts.files],
      loadSystemFonts: fonts.files.length === 0,
      monospaceFamily: fonts.monoFamily,
      sansSerifFamily: fonts.sansFamily,
    },
    logLevel: "off",
  });
};

/**
 * Largest scale at or below `scale` that keeps a `width` x `height` SVG
 * within `maxPixels` raster pixels.
 */
export const limitRasterScale = function limitRasterScale(
  width: number,
  height: number,
  scale: number,
  maxPixels?: number
): number {
  const area = width * height;

  if (maxPixels === undefined || area <= 0 || area * scale * scale <= maxPixels) {
    return scale;
  }

  return Math.sqrt(maxPixels / area);
};

/** Rasterize `svg` to PNG. Throws on resvg parse or render errors. */
export const rasterizeSvg = function rasterizeSvg(
  svg: string,
  options: RasterizeOptions = {}
): RasterizedSvg {
  const started = performance.now();
  const fonts = options.fonts ?? defaultFonts();
  const scale = options.scale ?? 2;

  let resvg = createResvg(svg, scale, fonts, options.background);
  const svgWidth = resvg.width;
  const svgHeight = resvg.height;
  const limited = limitRasterScale(svgWidth, svgHeight, scale, options.maxPixels);

  // resvg fixes the zoom when it parses, so a large SVG parses a second time.
  if (limited !== scale) {
    resvg = createResvg(svg, limited, fonts, options.background);
  }

  const image = resvg.render();
  const png = new Uint8Array(image.asPng());

  return {
    height: image.height,
    ms: performance.now() - started,
    png,
    svgHeight,
    svgWidth,
    width: image.width,
  };
};
