import type { ActionDefinition } from "@tooee/commands";
import type { CodeBlockRenderer, ImageLoader } from "@tooee/renderers";
import { Outlet, RouterProvider } from "@tooee/router";
import { launchCli, runCliSession } from "@tooee/shell";
import type { ReactNode } from "react";

import { DirectoryView } from "./directory-view.js";
import type { LinkHandler } from "./link-handlers.js";
import { createStandaloneRouter } from "./standalone-router.js";
import type { ContentProvider, ContentRenderer, MarkdownLinkActivateHandler } from "./types.js";

export interface ViewLaunchOptions {
  contentProvider: ContentProvider;
  /** Source file for standalone local Markdown navigation; omitted for stdin. */
  filePath?: string;
  /** Synchronous handlers tried before local file navigation. */
  linkHandlers?: readonly LinkHandler[];
  /**
   * Handles activation of a Markdown link, by mouse or by Enter on the cursor
   * line. When set, it replaces the default handling: `linkHandlers`, local
   * file navigation, and the stdin "Links need a source file" toast.
   */
  onMarkdownLinkActivate?: MarkdownLinkActivateHandler;
  actions?: ActionDefinition[];
  renderers?: Record<string, ContentRenderer>;
  /**
   * Custom renderers for fenced code blocks in markdown content, keyed by
   * fence type (first word of the fence info string, case-insensitive).
   * Unmatched types fall back to the default syntax-highlighted code block.
   */
  codeBlockRenderers?: Record<string, CodeBlockRenderer>;
  /**
   * Loaders for image formats that OpenTUI cannot decode, such as SVG from
   * `@tooee/svg`. A file that a loader matches opens as an image, and
   * Markdown images use the loaders too. Without a loader, an SVG file opens
   * as text.
   */
  imageLoaders?: readonly ImageLoader[];
  /** Open the heading outline beside Markdown content at start. */
  outline?: boolean;
}

export interface DirectoryLaunchOptions {
  dirPath: string;
  actions?: ActionDefinition[];
  /** Loaders for image formats that OpenTUI cannot decode. See `ViewLaunchOptions`. */
  imageLoaders?: readonly ImageLoader[];
}

export const launch = async function launch(options: ViewLaunchOptions): Promise<void> {
  const { router } = createStandaloneRouter(options);
  const startup = await router.start();

  if (startup.status !== "committed") {
    throw new Error(`View router startup ${startup.status}`);
  }

  await runCliSession<undefined>(
    (): ReactNode => (
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>
    ),
    {
      stdinPolicy: "tty-if-piped",
      stdoutPolicy: "tty-if-redirected",
    }
  );
};

export const launchDirectory = async function launchDirectory(
  options: DirectoryLaunchOptions
): Promise<void> {
  await launchCli(
    <DirectoryView
      dirPath={options.dirPath}
      actions={options.actions}
      imageLoaders={options.imageLoaders}
    />,
    {
      stdoutPolicy: "tty-if-redirected",
    }
  );
};
