import { launchCli, runCliSession } from "@tooee/shell";
import type { ActionDefinition } from "@tooee/commands";
import type { CodeBlockRenderer } from "@tooee/renderers";
import { StandaloneView } from "./standalone-view.js";
import { DirectoryView } from "./directory-view.js";
import type { ContentProvider, ContentRenderer } from "./types.js";
import type { ReactNode } from "react";

export interface ViewLaunchOptions {
  contentProvider: ContentProvider;
  /** Source file for standalone local Markdown navigation; omitted for stdin. */
  filePath?: string;
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
  await runCliSession<undefined>(
    (): ReactNode => (
      <StandaloneView
        filePath={options.filePath}
        contentProvider={options.contentProvider}
        actions={options.actions}
        renderers={options.renderers}
        codeBlockRenderers={options.codeBlockRenderers}
      />
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
