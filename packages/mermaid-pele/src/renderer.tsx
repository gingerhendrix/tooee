/**
 * A ```mermaid CodeBlockRenderer that draws Pele SVG as a terminal image.
 *
 * Tooee does not register this renderer by default. An app opts in through
 * the `codeBlockRenderers` prop or launch option:
 *
 *     codeBlockRenderers: { mermaid: createPeleMermaidRenderer() }
 */

import type { ImageRenderProtocol } from "@opentui/core";
import { useRenderer, useTerminalDimensions } from "@opentui/react";
import {
  CodeBlockChrome,
  IMAGE_WINDOW_PADDING_ROWS,
  mermaidCodeBlockRenderer,
} from "@tooee/renderers";
import type { CodeBlockRenderer, CodeBlockRendererProps } from "@tooee/renderers";
import type { ReactNode } from "react";

import { useDiagramImageSupport } from "./image-support.js";
import type { RasterFonts } from "./rasterize.js";
import { createPeleRenderCache } from "./render.js";
import type { PeleDiagram } from "./render.js";
import { cellGeometry, imageBoxSize } from "./sizing.js";
import { peleVariablesFromTheme } from "./svg-theme.js";

/**
 * Order of renderers for one fence. Each step falls through to the next when
 * it cannot draw the fence. The last step is always the fence source.
 *
 * - `pele-then-ascii`: Pele image, then beautiful-mermaid ASCII, then source.
 * - `ascii-then-pele`: beautiful-mermaid ASCII, then Pele image, then source.
 * - `pele-only`: Pele image, then source.
 */
export const PELE_MERMAID_STRATEGIES = ["pele-then-ascii", "ascii-then-pele", "pele-only"] as const;

export type PeleMermaidStrategy = (typeof PELE_MERMAID_STRATEGIES)[number];

export interface PeleMermaidRendererOptions {
  /** Default `pele-then-ascii`. */
  strategy?: PeleMermaidStrategy;
  /**
   * Image protocol for the OpenTUI `<image>` element. Default `auto`. When
   * `auto` resolves to `blocks`, the Pele step is skipped as if Pele had
   * failed. Pass `blocks` to draw half-block images anyway.
   */
  protocol?: ImageRenderProtocol;
  /**
   * Rows one diagram may use before it shrinks to fit. Default: the terminal
   * height less `IMAGE_WINDOW_PADDING_ROWS`.
   */
  maxRows?: number;
  /**
   * Screen pixels per SVG pixel before the box shrinks to fit. Pele draws
   * labels at 16 CSS px, which reads small next to terminal text on a
   * scaled display. Default `DEFAULT_MERMAID_ZOOM` (1.5).
   */
  zoom?: number;
  /**
   * Raster pixel density over the SVG size. Default: the larger of 2 and
   * `zoom`, so the PNG is never enlarged on screen.
   */
  scale?: number;
  /** Rendered diagrams kept in this renderer's cache. Default 64. */
  cacheSize?: number;
  /** Fonts for the raster. Default: the first known fonts found on disk. */
  fonts?: RasterFonts;
  /** Fixed clock for gantt "today" markers. Default: the current time. */
  now?: Date;
}

/** Default `zoom`: Pele's 16 px labels draw at 24 screen px. */
export const DEFAULT_MERMAID_ZOOM = 1.5;

const FONT_FAMILY = "sans-serif";

const MONO_FAMILY = "monospace";

const PeleImage = function PeleImage({
  diagram,
  width,
  maxRows,
  zoom,
  protocol,
}: {
  diagram: PeleDiagram;
  width: number;
  maxRows: number | undefined;
  zoom: number;
  protocol: ImageRenderProtocol;
}): ReactNode {
  const renderer = useRenderer();
  const { height: terminalHeight } = useTerminalDimensions();

  const box = imageBoxSize(
    diagram.svgWidth * zoom,
    diagram.svgHeight * zoom,
    cellGeometry(renderer),
    {
      maxCols: width,
      maxRows: maxRows ?? terminalHeight - IMAGE_WINDOW_PADDING_ROWS,
    }
  );

  return (
    <image
      source={diagram.png}
      fit="fit"
      protocol={protocol}
      style={{ height: box.rows, width: box.cols }}
    />
  );
};

/**
 * Create a `mermaid` code block renderer. Each call has its own options and
 * its own render cache, so two views can use different settings.
 */
export const createPeleMermaidRenderer = function createPeleMermaidRenderer(
  options: PeleMermaidRendererOptions = {}
): CodeBlockRenderer {
  const strategy = options.strategy ?? "pele-then-ascii";
  const protocol = options.protocol ?? "auto";
  const { maxRows } = options;
  const zoom = options.zoom ?? DEFAULT_MERMAID_ZOOM;
  const scale = options.scale ?? Math.max(2, zoom);
  const cache = createPeleRenderCache(options.cacheSize);

  /** Pele image inside the standard chrome, or null when Pele cannot draw it. */
  const renderPele = (props: CodeBlockRendererProps, imagesSupported: boolean): ReactNode => {
    if (!imagesSupported) {
      return null;
    }

    const result = cache.render(props.text, {
      fonts: options.fonts,
      now: options.now,
      scale,
      variables: peleVariablesFromTheme(props.theme, FONT_FAMILY, MONO_FAMILY),
    });

    if (!result.ok) {
      return null;
    }

    return (
      <CodeBlockChrome theme={props.theme} indent={props.indent}>
        <PeleImage
          diagram={result}
          width={props.width}
          maxRows={maxRows}
          zoom={zoom}
          protocol={protocol}
        />
      </CodeBlockChrome>
    );
  };

  // A hook-calling renderer under the CodeBlockRenderer contract: the same
  // hook runs on every render of the fence. A null result makes Tooee show
  // the fence source.
  const PeleMermaidRenderer = function PeleMermaidRenderer(
    props: CodeBlockRendererProps
  ): ReactNode {
    const imagesSupported = useDiagramImageSupport(protocol);

    if (strategy === "ascii-then-pele") {
      return mermaidCodeBlockRenderer(props) ?? renderPele(props, imagesSupported);
    }

    const pele = renderPele(props, imagesSupported);

    if (strategy === "pele-only") {
      return pele;
    }

    return pele ?? mermaidCodeBlockRenderer(props);
  };

  return PeleMermaidRenderer;
};
