import { useProvideCommandContextKey } from "@tooee/commands";
import type { MarkSet } from "@tooee/marks";
import type { AnyContent } from "../types.js";

/**
 * The `view` field contributed to the command context (see augmentation below).
 *
 * This slice is content-only. Row state — cursor, selection, active and
 * selected rows — is generic to every row document and lives on `ctx.document`,
 * which `DocumentScreen` provides alongside this.
 */
export interface ViewCommandContext {
  content: AnyContent;
  format: string;
  title?: string;
  data?: unknown;
  /** Reload the content from its provider. */
  reload: () => void;
  marks: {
    setMarkSet: (set: MarkSet) => void;
    clearNamespace: (namespace: string) => void;
    clearAll: () => void;
    userMarks: MarkSet[];
    providerMarks: MarkSet[];
  };
}

declare module "@tooee/commands" {
  interface CommandContext {
    view: ViewCommandContext;
  }
}

const noop = () => {};

export interface CreateViewCommandContextOptions {
  /**
   * Content represented by this command context. Custom/headless surfaces may
   * omit it; the builder will synthesize a minimal custom content object.
   */
  content?: AnyContent;
  format?: string;
  title?: string;
  data?: unknown;
  reload?: () => void;
  marks?: Partial<ViewCommandContext["marks"]>;
}

export type ProvideViewCommandContextOptions = CreateViewCommandContextOptions;

export function createViewCommandContext({
  content,
  format,
  title,
  data,
  reload,
  marks,
}: CreateViewCommandContextOptions): ViewCommandContext {
  const resolvedFormat = format ?? content?.format ?? "custom";
  const resolvedContent: AnyContent =
    content ??
    ({
      format: resolvedFormat,
      data,
      title,
    } satisfies AnyContent);

  return {
    content: resolvedContent,
    format: resolvedFormat,
    title: title ?? content?.title,
    data: data ?? ("data" in resolvedContent ? resolvedContent.data : undefined),
    reload: reload ?? noop,
    marks: {
      setMarkSet: marks?.setMarkSet ?? noop,
      clearNamespace: marks?.clearNamespace ?? noop,
      clearAll: marks?.clearAll ?? noop,
      userMarks: marks?.userMarks ?? [],
      providerMarks: marks?.providerMarks ?? [],
    },
  };
}

export function useProvideViewCommandContext(
  options: ProvideViewCommandContextOptions | (() => ProvideViewCommandContextOptions),
) {
  useProvideCommandContextKey("view", () =>
    createViewCommandContext(typeof options === "function" ? options() : options),
  );
}
