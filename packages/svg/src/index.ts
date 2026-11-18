export { createSvgImageLoader, DEFAULT_SVG_MAX_PIXELS, DEFAULT_SVG_SCALE } from "./loader.js";

export type { SvgImageLoaderOptions } from "./loader.js";

export { findRasterFonts, limitRasterScale, rasterizeSvg } from "./rasterize.js";

export type { RasterFonts, RasterizedSvg, RasterizeOptions } from "./rasterize.js";

export { decodeSvgDataUri, isSvgSource, readSvgSource } from "./source.js";

export type { ReadSvgOptions } from "./source.js";
