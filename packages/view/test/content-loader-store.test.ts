import { MarkSet } from "../../marks/src/index.js";
import { describe, expect, test } from "bun:test";
import {
  createContentLoaderStore,
  normalizeError,
  selectContent,
  selectProviderMarks,
} from "../src/content-loader-store.js";

const text = (value: string) => ({ format: "text" as const, text: value });

describe("content loader store", () => {
  test("models sync and streaming lifecycles while preserving last content on load", () => {
    const store = createContentLoaderStore();
    store.trigger.loadStarted({ marks: [], title: "First" });
    const firstId = store.getSnapshot().context.requestId;
    expect(store.getSnapshot().context.status).toBe("loading");
    store.trigger.loaded({ content: text("old"), requestId: firstId });
    expect(store.getSnapshot().context.status).toBe("ready");

    store.trigger.loadStarted({ marks: [], title: "Stream" });
    const streamId = store.getSnapshot().context.requestId;
    expect(selectContent(store.getSnapshot().context)).toEqual(text("old"));
    store.trigger.streamStarted({ format: "text", requestId: streamId });
    store.trigger.chunkReceived({
      chunk: { data: "new", format: "text", type: "append" },
      requestId: streamId,
    });
    expect(store.getSnapshot().context.status).toBe("streaming");
    expect(selectContent(store.getSnapshot().context)).toEqual({
      format: "text",
      text: "new",
      title: "Stream",
    });
    store.trigger.streamEnded({ requestId: streamId });
    expect(store.getSnapshot().context.status).toBe("ready");
  });

  test("stale async events are identity-preserving no-ops", () => {
    const store = createContentLoaderStore();
    store.trigger.loadStarted({ marks: [] });
    const staleId = store.getSnapshot().context.requestId;
    store.trigger.loadStarted({ marks: [] });
    const events = [
      () => store.trigger.streamStarted({ format: "text", requestId: staleId }),
      () =>
        store.trigger.chunkReceived({
          chunk: { data: "stale", format: "text", type: "append" },
          requestId: staleId,
        }),
      () => store.trigger.loaded({ content: text("stale"), requestId: staleId }),
      () => store.trigger.streamEnded({ requestId: staleId }),
      () => store.trigger.loadFailed({ error: "stale", requestId: staleId }),
      () => store.trigger.loadCancelled({ requestId: staleId }),
    ];
    for (const trigger of events) {
      const before = store.getSnapshot().context;
      trigger();
      expect(store.getSnapshot().context).toBe(before);
    }
  });

  test("reload is an event and cancellation invalidates the request", () => {
    const store = createContentLoaderStore();
    store.trigger.loadStarted({ marks: [] });
    const requestId = store.getSnapshot().context.requestId;
    const content = store.getSnapshot().context.content;
    const marks = store.getSnapshot().context.providerMarks;
    store.trigger.reloadRequested({});
    expect(store.getSnapshot().context.loadSeq).toBe(1);
    expect(store.getSnapshot().context.content).toBe(content);
    expect(store.getSnapshot().context.providerMarks).toBe(marks);
    store.trigger.loadCancelled({ requestId });
    expect(store.getSnapshot().context.requestId).toBe(requestId + 1);
  });

  test("merges streamed marks by namespace without replacing content", () => {
    const store = createContentLoaderStore();
    const first = new MarkSet("diagnostics", 0, []);
    const replacement = new MarkSet("diagnostics", 0, []);
    store.trigger.loadStarted({ marks: [first] });
    const requestId = store.getSnapshot().context.requestId;
    store.trigger.loaded({ content: text("kept"), requestId });
    const content = selectContent(store.getSnapshot().context);
    store.trigger.chunkReceived({ chunk: { set: replacement, type: "marks" }, requestId });
    expect(selectProviderMarks(store.getSnapshot().context)).toEqual([replacement]);
    expect(selectContent(store.getSnapshot().context)).toBe(content);
  });

  test("normalizes Error and non-Error failures", () => {
    expect(normalizeError(new Error("boom"))).toBe("boom");
    expect(normalizeError("string failure")).toBe("string failure");
    expect(normalizeError(42)).toBe("42");
    expect(normalizeError(undefined)).toBe("undefined");
  });
});
