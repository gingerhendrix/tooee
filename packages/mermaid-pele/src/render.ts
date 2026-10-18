/**
 * Pele pipeline: Mermaid source -> Pele SVG -> inlined theme colors -> PNG.
 *
 * Errors never throw out of this module. A failed stage returns a result
 * with `ok: false`, so the caller can fall back to another renderer.
 */

import { PeleError, render } from "pele";

import { rasterizeSvg } from "./rasterize.js";
import type { RasterFonts } from "./rasterize.js";
import { inlineCssVariables } from "./svg-theme.js";
import type { PeleVariables } from "./svg-theme.js";

export interface PeleDiagram {
  ok: true;
  /** Pele diagram type, for example "flowchart" or "sequence". */
  type: string;
  /** Themed SVG with every CSS variable inlined. */
  svg: string;
  /** SVG size in CSS pixels, from Pele. */
  svgWidth: number;
  svgHeight: number;
  png: Uint8Array;
  pngWidth: number;
  pngHeight: number;
  peleMs: number;
  rasterMs: number;
}

export interface PeleFailure {
  ok: false;
  stage: "pele" | "rasterize";
  /** Pele error code ("syntax", "limit", and others) when Pele threw a PeleError. */
  code?: string;
  message: string;
}

export type PeleRenderResult = PeleDiagram | PeleFailure;

export interface PeleRenderOptions {
  variables: PeleVariables;
  /** Raster pixel density over the SVG size. Default 2. */
  scale?: number;
  /** Fonts for the raster. Default: the first known fonts found on disk. */
  fonts?: RasterFonts;
  /** Fixed clock for gantt "today" markers, so renders are repeatable. */
  now?: Date;
}

export const renderPeleDiagram = function renderPeleDiagram(
  source: string,
  options: PeleRenderOptions
): PeleRenderResult {
  const peleStarted = performance.now();
  let rendered: ReturnType<typeof render>;

  try {
    // Links and images are not useful inside a raster, and keep the SVG local.
    rendered = render(source, { images: false, links: false, now: options.now });
  } catch (error) {
    return {
      code: error instanceof PeleError ? error.code : undefined,
      message: error instanceof Error ? error.message : String(error),
      ok: false,
      stage: "pele",
    };
  }

  const peleMs = performance.now() - peleStarted;
  const svg = inlineCssVariables(rendered.svg, options.variables);

  try {
    const raster = rasterizeSvg(svg, {
      background: options.variables.get("pele-bg"),
      fonts: options.fonts,
      scale: options.scale,
    });

    return {
      ok: true,
      peleMs,
      png: raster.png,
      pngHeight: raster.height,
      pngWidth: raster.width,
      rasterMs: raster.ms,
      svg,
      svgHeight: rendered.height,
      svgWidth: rendered.width,
      type: rendered.type,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : String(error),
      ok: false,
      stage: "rasterize",
    };
  }
};

export interface PeleRenderCache {
  render: (source: string, options: PeleRenderOptions) => PeleRenderResult;
  clear: () => void;
  readonly size: number;
}

/**
 * A small LRU keyed by source, theme variables, and scale, so scrolling and
 * re-renders do not repeat the resvg work. A theme change misses the cache
 * and renders again. Failures are cached too, so a bad fence is parsed once.
 */
export const createPeleRenderCache = function createPeleRenderCache(limit = 64): PeleRenderCache {
  const entries = new Map<string, PeleRenderResult>();

  const renderCached = (source: string, options: PeleRenderOptions): PeleRenderResult => {
    const key = `${JSON.stringify([...options.variables])}\u0000${options.scale ?? 2}\u0000${source}`;
    const hit = entries.get(key);

    if (hit !== undefined) {
      entries.delete(key);
      entries.set(key, hit);

      return hit;
    }

    const result = renderPeleDiagram(source, options);
    entries.set(key, result);

    if (entries.size > limit) {
      const oldest = entries.keys().next().value;

      if (oldest !== undefined) {
        entries.delete(oldest);
      }
    }

    return result;
  };

  return {
    clear: () => {
      entries.clear();
    },
    render: renderCached,
    get size() {
      return entries.size;
    },
  };
};
