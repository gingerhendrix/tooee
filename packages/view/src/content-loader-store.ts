import { createStore } from "@xstate/store";
import type { MarkSet } from "@tooee/marks";
import type { AnyContent, Content, ContentChunk, ContentFormat, CustomContent } from "./types.js";

export type ContentLoaderStatus = "idle" | "loading" | "streaming" | "ready" | "error";

export interface ContentLoaderContext {
  status: ContentLoaderStatus;
  requestId: number;
  loadSeq: number;
  content: AnyContent | null;
  error: string | null;
  providerMarks: MarkSet[];
  title: string | undefined;
}

export type ContentLoaderEvents = {
  loadStarted: { marks: MarkSet[]; title?: string };
  streamStarted: { requestId: number; format: string };
  chunkReceived: { requestId: number; chunk: ContentChunk };
  loaded: { requestId: number; content: AnyContent };
  streamEnded: { requestId: number };
  loadFailed: { requestId: number; error: string };
  loadCancelled: { requestId: number };
  reloadRequested: {};
};

export function isAsyncIterable(value: unknown): value is AsyncIterable<ContentChunk> {
  return value != null && typeof value === "object" && Symbol.asyncIterator in value;
}

export function createEmptyContent(format: string, title?: string): AnyContent {
  switch (format) {
    case "markdown":
      return { format, markdown: "", title };
    case "code":
      return { format, code: "", title };
    case "text":
      return { format, text: "", title };
    case "table":
      return { format, columns: [], rows: [], title };
    default:
      return { format, data: undefined, title } as CustomContent;
  }
}

function ensureContentFormat<F extends ContentFormat>(
  current: AnyContent | null,
  format: F,
  title?: string,
): Extract<Content, { format: F }> {
  if (!current || current.format !== format) {
    return createEmptyContent(format, title) as Extract<Content, { format: F }>;
  }
  return current as Extract<Content, { format: F }>;
}

export function applyContentChunk(
  current: AnyContent | null,
  chunk: ContentChunk,
  title?: string,
): AnyContent {
  switch (chunk.type) {
    case "replace": {
      return chunk.content;
    }
    case "append": {
      if (chunk.format === "markdown") {
        const target = ensureContentFormat(current, "markdown", title);
        return { ...target, markdown: target.markdown + chunk.data };
      }
      if (chunk.format === "code") {
        const target = ensureContentFormat(current, "code", title);
        return {
          ...target,
          code: target.code + chunk.data,
          language: chunk.language ?? target.language,
        };
      }
      {
        const target = ensureContentFormat(current, "text", title);
        return { ...target, text: target.text + chunk.data };
      }
    }
    case "patch": {
      return chunk.apply(current);
    }
    default: {
      return current ?? createEmptyContent("markdown", title);
    }
  }
}

export function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createContentLoaderStore() {
  return createStore<ContentLoaderContext, ContentLoaderEvents>({
    context: {
      status: "idle",
      requestId: 0,
      loadSeq: 0,
      content: null,
      error: null,
      providerMarks: [],
      title: undefined,
    },
    on: {
      loadStarted: (ctx, event) => ({
        ...ctx,
        status: "loading",
        requestId: ctx.requestId + 1,
        error: null,
        providerMarks: event.marks,
        title: event.title,
      }),
      streamStarted: (ctx, event) =>
        event.requestId !== ctx.requestId
          ? ctx
          : {
              ...ctx,
              status: "streaming",
              content: createEmptyContent(event.format, ctx.title),
            },
      chunkReceived: (ctx, event) => {
        if (event.requestId !== ctx.requestId) {
          return ctx;
        }
        if (event.chunk.type === "marks") {
          const markSet = event.chunk.set;
          const providerMarks = [
            ...ctx.providerMarks.filter((set) => set.namespace !== markSet.namespace),
            markSet,
          ];
          return { ...ctx, providerMarks };
        }
        return { ...ctx, content: applyContentChunk(ctx.content, event.chunk, ctx.title) };
      },
      loaded: (ctx, event) =>
        event.requestId !== ctx.requestId
          ? ctx
          : { ...ctx, status: "ready", content: event.content },
      streamEnded: (ctx, event) =>
        event.requestId !== ctx.requestId ? ctx : { ...ctx, status: "ready" },
      loadFailed: (ctx, event) =>
        event.requestId !== ctx.requestId ? ctx : { ...ctx, status: "error", error: event.error },
      loadCancelled: (ctx, event) =>
        event.requestId !== ctx.requestId ? ctx : { ...ctx, requestId: ctx.requestId + 1 },
      reloadRequested: (ctx) => ({ ...ctx, loadSeq: ctx.loadSeq + 1 }),
    },
  });
}

export const selectContent = (ctx: ContentLoaderContext) => ctx.content;
export const selectStatus = (ctx: ContentLoaderContext) => ctx.status;
export const selectStreaming = (ctx: ContentLoaderContext) => ctx.status === "streaming";
export const selectError = (ctx: ContentLoaderContext) => ctx.error;
export const selectProviderMarks = (ctx: ContentLoaderContext) => ctx.providerMarks;
export const selectLoadSeq = (ctx: ContentLoaderContext) => ctx.loadSeq;
