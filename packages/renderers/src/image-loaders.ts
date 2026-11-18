/**
 * Image loaders turn an image source that OpenTUI cannot decode, such as an
 * SVG file, into bytes that it can decode, such as PNG.
 *
 * OpenTUI's `<image>` decodes PNG, JPEG, WebP and GIF. Apps register loaders
 * for other formats through `imageLoaders` on `MarkdownView`, `View` and the
 * `@tooee/view` launch options. A source that no loader matches goes to
 * `<image>` unchanged.
 */

import type { ImageSource } from "@opentui/core";
import { useEffect, useState } from "react";

export interface LoadedImage {
  /** Bytes that the OpenTUI `<image>` element decodes, for example PNG. */
  data: Uint8Array;
  /**
   * Intrinsic image size in CSS pixels. Image boxes follow this size, so a
   * loader can rasterize at a higher pixel density for sharpness without
   * drawing the image larger.
   */
  width: number;
  height: number;
}

export interface ImageLoadOptions {
  /** Aborts when the source changes or the image unmounts. */
  signal: AbortSignal;
}

export interface ImageLoader {
  /** Short name for messages, for example `svg`. */
  name: string;
  /**
   * True when this loader handles `source`: an absolute path, a relative
   * path, or a URL such as `https:`, `file:` or `data:`.
   */
  matches: (source: string) => boolean;
  /** Load `source`. Rejects when the source cannot be read or converted. */
  load: (source: string, options: ImageLoadOptions) => Promise<LoadedImage>;
}

/** First loader in `loaders` that matches `source`. */
export const findImageLoader = function findImageLoader(
  source: string,
  loaders: readonly ImageLoader[] | undefined
): ImageLoader | undefined {
  return loaders?.find((loader) => loader.matches(source));
};

export interface ImageSize {
  width: number;
  height: number;
}

export type ImageSourceState =
  | { status: "loading" }
  | {
      status: "ready";
      /** Value for the `<image source>` prop. */
      source: ImageSource;
      /**
       * Intrinsic size from the loader. `null` when no loader matched, so the
       * caller sizes the box from the decoded pixel size in `onLoad`.
       */
      size: ImageSize | null;
    }
  | { status: "error"; message: string };

interface SettledLoad {
  source: string;
  loader: ImageLoader;
  state: ImageSourceState;
}

/** The path or URL text of `source`, or undefined for binary sources. */
const sourceText = function sourceText(source: ImageSource): string | undefined {
  if (source instanceof URL) {
    return source.href;
  }

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- ImageSource is OpenTUI's string-or-binary union; only text sources can match a loader
  return typeof source === "string" ? source : undefined;
};

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- caught loader failures enter here before conversion to display text
const errorMessage = function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
};

/** Run `loader` and turn its result or failure into a settled state. */
const loadImageState = async function loadImageState(
  loader: ImageLoader,
  source: string,
  signal: AbortSignal
): Promise<ImageSourceState> {
  try {
    const image = await loader.load(source, { signal });

    return {
      size: { height: image.height, width: image.width },
      source: image.data,
      status: "ready",
    };
  } catch (error) {
    return { message: errorMessage(error), status: "error" };
  }
};

/**
 * Resolve `source` through the first matching loader. Only path and URL
 * sources can match. With no matching loader, the state is `ready` at once and
 * holds `source` unchanged.
 */
export const useImageSource = function useImageSource(
  source: ImageSource,
  loaders: readonly ImageLoader[] | undefined
): ImageSourceState {
  const text = sourceText(source);
  const loader = text === undefined ? undefined : findImageLoader(text, loaders);
  const [settled, setSettled] = useState<SettledLoad | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    if (loader !== undefined && text !== undefined) {
      void (async () => {
        const state = await loadImageState(loader, text, controller.signal);

        if (!controller.signal.aborted) {
          setSettled({ loader, source: text, state });
        }
      })();
    }

    return () => {
      controller.abort();
    };
  }, [text, loader]);

  if (loader === undefined) {
    return { size: null, source, status: "ready" };
  }

  if (settled === null || settled.source !== text || settled.loader !== loader) {
    return { status: "loading" };
  }

  return settled.state;
};
