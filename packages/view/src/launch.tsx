import { launchCli, runCliSession } from "@tooee/shell";
import type { ActionDefinition } from "@tooee/commands";
import type { CodeBlockRenderer } from "@tooee/renderers";
import { Outlet, RouterProvider } from "@tooee/router";
import { createStandaloneRouter } from "./standalone-router.js";
import type { LinkHandler } from "./link-handlers.js";
import { DirectoryView } from "./directory-view.js";
import type { ContentProvider, ContentRenderer } from "./types.js";
import type { ReactNode } from "react";

export interface ViewLaunchOptions {
  contentProvider: ContentProvider;
  /** Source file for standalone local Markdown navigation; omitted for stdin. */
  filePath?: string;
  /** Synchronous handlers tried before local file navigation. */
  linkHandlers?: readonly LinkHandler[];
  actions?: ActionDefinition[];
  renderers?: Record<string, ContentRenderer>;
  /**
   * Custom renderers for fenced code blocks in markdown content, keyed by
   * fence type (first word of the fence info string, case-insensitive).
   * Unmatched types fall back to the default syntax-highlighted code block.
   */
  codeBlockRenderers?: Record<string, CodeBlockRenderer>;
}

export interface DirectoryLaunchOptions {
  dirPath: string;
  actions?: ActionDefinition[];
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
    },
  );
};

export const launchDirectory = async function launchDirectory(
  options: DirectoryLaunchOptions,
): Promise<void> {
  await launchCli(<DirectoryView dirPath={options.dirPath} actions={options.actions} />, {
    stdoutPolicy: "tty-if-redirected",
  });
};
