export { createPeleMermaidRenderer, PELE_MERMAID_STRATEGIES } from "./renderer.js";

export type { PeleMermaidRendererOptions, PeleMermaidStrategy } from "./renderer.js";

export { createPeleRenderCache, renderPeleDiagram } from "./render.js";

export type {
  PeleDiagram,
  PeleFailure,
  PeleRenderCache,
  PeleRenderOptions,
  PeleRenderResult,
} from "./render.js";

export { findRasterFonts, rasterizeSvg } from "./rasterize.js";

export type { RasterFonts, RasterizedSvg, RasterizeOptions } from "./rasterize.js";

export { inlineCssVariables, peleVariablesFromTheme } from "./svg-theme.js";

export type { PeleVariables } from "./svg-theme.js";

export { cellGeometry, DEFAULT_CELL_GEOMETRY, imageBoxSize } from "./sizing.js";

export type { CellGeometry, ImageBox, ImageBoxOptions, PixelResolutionSource } from "./sizing.js";

export { supportsDiagramImages, useDiagramImageSupport } from "./image-support.js";

export type { ImageSupportSource } from "./image-support.js";
