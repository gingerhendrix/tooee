/**
 * An `ImageLoader` that rasterizes SVG sources to PNG for the OpenTUI
 * `<image>` element, which cannot decode SVG.
 */

import type { ImageLoader, LoadedImage } from "@tooee/renderers";

import { rasterizeSvg } from "./rasterize.js";
import type { RasterFonts } from "./rasterize.js";
import { isSvgSource, readSvgSource } from "./source.js";
import type { ReadSvgOptions } from "./source.js";

/** Default raster density: two PNG pixels for each CSS pixel. */
export const DEFAULT_SVG_SCALE = 2;

/** Default PNG pixel cap, 4096 x 4096. */
export const DEFAULT_SVG_MAX_PIXELS = 4096 * 4096;

export interface SvgImageLoaderOptions {
  /**
   * PNG pixels for each SVG CSS pixel. It changes sharpness, not the drawn
   * size. Default `DEFAULT_SVG_SCALE` (2).
   */
  scale?: number;
  /** Largest PNG pixel count. Default `DEFAULT_SVG_MAX_PIXELS`. */
  maxPixels?: number;
  /** Color painted under the SVG. Default: none, so the SVG stays transparent. */
  background?: string;
  /** Fonts for SVG text. Default: the fonts that `findRasterFonts` detects. */
  fonts?: RasterFonts;
  /** Fetch for `http(s):` sources. Default: the global `fetch`. */
  fetch?: ReadSvgOptions["fetch"];
}

/**
 * Create a loader for SVG files, `file:` and `http(s):` SVG URLs, and
 * `data:image/svg+xml` URIs. The loaded image reports the SVG's CSS size, so
 * Tooee draws it at the same size as a PNG of that size.
 */
export const createSvgImageLoader = function createSvgImageLoader(
  options: SvgImageLoaderOptions = {}
): ImageLoader {
  return {
    load: async (source, { signal }): Promise<LoadedImage> => {
      const svg = await readSvgSource(source, { fetch: options.fetch, signal });

      signal.throwIfAborted();

      const raster = rasterizeSvg(svg, {
        background: options.background,
        fonts: options.fonts,
        maxPixels: options.maxPixels ?? DEFAULT_SVG_MAX_PIXELS,
        scale: options.scale ?? DEFAULT_SVG_SCALE,
      });

      return { data: raster.png, height: raster.svgHeight, width: raster.svgWidth };
    },
    matches: isSvgSource,
    name: "svg",
  };
};
