import { useCallback, useEffect, useMemo } from "react";
import { useSelector } from "@xstate/store-react";
import type { ContentProvider } from "../types.js";
import {
  createContentLoaderStore,
  isAsyncIterable,
  normalizeError,
  selectContent,
  selectError,
  selectLoadSeq,
  selectProviderMarks,
  selectStatus,
  selectStreaming,
} from "../content-loader-store.js";

export const useContentLoader = function useContentLoader(contentProvider: ContentProvider) {
  const store = useMemo(createContentLoaderStore, []);
  const loadSeq = useSelector(store, (snapshot) => selectLoadSeq(snapshot.context));

  useEffect(() => {
    store.trigger.loadStarted({
      marks: contentProvider.marks ?? [],
      title: contentProvider.title,
    });
    const { requestId } = store.getSnapshot().context;
    const loaded = contentProvider.load();
    let cleanup: () => void = () => {
      // Synchronous providers have no pending work to cancel.
    };

    if (isAsyncIterable(loaded)) {
      store.trigger.streamStarted({
        format: contentProvider.format ?? "markdown",
        requestId,
      });
      const iterator = loaded[Symbol.asyncIterator]();
      void (async () => {
        try {
          while (true) {
            // Deferred(lint-sweep): preserve sequential stream consumption for ordered backpressure.
            // oxlint-disable-next-line no-await-in-loop -- each chunk must be consumed in iterator order
            const result = await iterator.next();
            if (result.done === true) {
              break;
            }
            store.trigger.chunkReceived({ chunk: result.value, requestId });
          }
          store.trigger.streamEnded({ requestId });
        } catch (error) {
          store.trigger.loadFailed({ error: normalizeError(error), requestId });
        }
      })();
      cleanup = () => {
        store.trigger.loadCancelled({ requestId });
        void (async () => {
          try {
            await iterator.return?.();
          } catch {
            // Iterator cleanup is best-effort during effect disposal.
          }
        })();
      };
    } else if (loaded instanceof Promise) {
      void (async () => {
        try {
          const content = await loaded;
          store.trigger.loaded({ content, requestId });
        } catch (error) {
          store.trigger.loadFailed({ error: normalizeError(error), requestId });
        }
      })();
      cleanup = () => {
        store.trigger.loadCancelled({ requestId });
      };
    } else {
      store.trigger.loaded({ content: loaded, requestId });
    }

    return cleanup;
  }, [contentProvider, loadSeq, store]);

  const content = useSelector(store, (snapshot) => selectContent(snapshot.context));
  const streaming = useSelector(store, (snapshot) => selectStreaming(snapshot.context));
  const error = useSelector(store, (snapshot) => selectError(snapshot.context));
  const providerMarks = useSelector(store, (snapshot) => selectProviderMarks(snapshot.context));
  const status = useSelector(store, (snapshot) => selectStatus(snapshot.context));
  const reload = useCallback(() => {
    store.trigger.reloadRequested({});
  }, [store]);

  return { content, error, providerMarks, reload, status, streaming };
};
