import { useProvideCommandContextKey, useMode } from "@tooee/commands"
import type { Mode } from "@tooee/commands"
import type { NavigationState } from "@tooee/shell"
import type { MarkSet } from "@tooee/marks"
import type { AnyContent } from "../types.js"

/** The `view` field contributed to the command context (see augmentation below). */
export interface ViewCommandContext {
  content: AnyContent
  format: string
  title?: string
  data?: unknown
  cursor: number | null
  selection: { start: number; end: number } | null
  mode: Mode
  toggledIndices: Set<number>
  reload: () => void
  marks: {
    setMarkSet: (set: MarkSet) => void
    clearNamespace: (namespace: string) => void
    clearAll: () => void
    userMarks: MarkSet[]
    providerMarks: MarkSet[]
  }
  /** Subview extras (e.g. activeRow/selectedRows for tables). */
  [key: string]: unknown
}

declare module "@tooee/commands" {
  interface CommandContext {
    view: ViewCommandContext
  }
}

const noop = () => {}

type ViewNavigationContext = Pick<NavigationState, "cursor" | "selection" | "toggledIndices">

export interface CreateViewCommandContextOptions {
  /**
   * Content represented by this command context. Custom/headless surfaces may
   * omit it; the builder will synthesize a minimal custom content object.
   */
  content?: AnyContent
  format?: string
  title?: string
  data?: unknown
  nav?: ViewNavigationContext
  cursor?: number | null
  selection?: { start: number; end: number } | null
  /** Caller-owned mode value. Prefer `useProvideViewCommandContext` in React so this is live. */
  mode: Mode
  toggledIndices?: Set<number>
  reload?: () => void
  marks?: Partial<ViewCommandContext["marks"]>
  extras?: Record<string, unknown>
}

export type ProvideViewCommandContextOptions = Omit<CreateViewCommandContextOptions, "mode"> & {
  /** Advanced override; normally omitted so the hook injects the live command mode. */
  mode?: Mode
}

export function createViewCommandContext({
  content,
  format,
  title,
  data,
  nav,
  cursor,
  selection,
  mode,
  toggledIndices,
  reload,
  marks,
  extras,
}: CreateViewCommandContextOptions): ViewCommandContext {
  const resolvedFormat = format ?? content?.format ?? "custom"
  const resolvedContent: AnyContent =
    content ??
    ({
      format: resolvedFormat,
      data,
      title,
    } satisfies AnyContent)

  return {
    ...extras,
    content: resolvedContent,
    format: resolvedFormat,
    title: title ?? content?.title,
    data: data ?? ("data" in resolvedContent ? resolvedContent.data : undefined),
    cursor: cursor ?? nav?.cursor ?? null,
    selection: selection ?? nav?.selection ?? null,
    mode,
    toggledIndices: toggledIndices ?? nav?.toggledIndices ?? new Set<number>(),
    reload: reload ?? noop,
    marks: {
      setMarkSet: marks?.setMarkSet ?? noop,
      clearNamespace: marks?.clearNamespace ?? noop,
      clearAll: marks?.clearAll ?? noop,
      userMarks: marks?.userMarks ?? [],
      providerMarks: marks?.providerMarks ?? [],
    },
  }
}

export function useProvideViewCommandContext(
  options: ProvideViewCommandContextOptions | (() => ProvideViewCommandContextOptions),
) {
  const mode = useMode()
  useProvideCommandContextKey("view", () => {
    const resolvedOptions = typeof options === "function" ? options() : options
    return createViewCommandContext({
      ...resolvedOptions,
      mode: resolvedOptions.mode ?? mode,
    })
  })
}

interface UseViewCommandContextParams {
  content: AnyContent
  nav: NavigationState
  reload: () => void
  providerMarks: MarkSet[]
  userMarks: MarkSet[]
  setMarkSet: (set: MarkSet) => void
  clearMarkNamespace: (namespace: string) => void
  clearAllUserMarks: () => void
  /** Extra fields merged into the view context (e.g. activeRow, selectedRows for table) */
  extras?: Record<string, unknown>
}

export function useViewCommandContext({
  content,
  nav,
  reload,
  providerMarks,
  userMarks,
  setMarkSet,
  clearMarkNamespace,
  clearAllUserMarks,
  extras,
}: UseViewCommandContextParams) {
  useProvideViewCommandContext({
    content,
    nav,
    reload,
    marks: {
      setMarkSet,
      clearNamespace: clearMarkNamespace,
      clearAll: clearAllUserMarks,
      userMarks,
      providerMarks,
    },
    extras,
  })
}
