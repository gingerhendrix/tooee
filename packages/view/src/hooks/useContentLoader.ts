import { useCallback, useEffect, useState } from "react";
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

export function useContentLoader(contentProvider: ContentProvider) {
  const [store] = useState(createContentLoaderStore);
  const loadSeq = useSelector(store, (snapshot) => selectLoadSeq(snapshot.context));

  useEffect(() => {
    store.trigger.loadStarted({
      marks: contentProvider.marks ?? [],
      title: contentProvider.title,
    });
    const requestId = store.getSnapshot().context.requestId;
    const loaded = contentProvider.load();

    if (isAsyncIterable(loaded)) {
      store.trigger.streamStarted({
        requestId,
        format: contentProvider.format ?? "markdown",
      });
      const iterator = loaded[Symbol.asyncIterator]();
      (async () => {
        try {
          while (true) {
            const result = await iterator.next();
            if (result.done) {
              break;
            }
            store.trigger.chunkReceived({ requestId, chunk: result.value });
          }
          store.trigger.streamEnded({ requestId });
        } catch (error) {
          store.trigger.loadFailed({ requestId, error: normalizeError(error) });
        }
      })();
      return () => {
        store.trigger.loadCancelled({ requestId });
        Promise.resolve(iterator.return?.()).catch(() => {});
      };
    }

    if (loaded instanceof Promise) {
      loaded
        .then((content) => store.trigger.loaded({ requestId, content }))
        .catch((error: unknown) =>
          store.trigger.loadFailed({ requestId, error: normalizeError(error) }),
        );
      return () => store.trigger.loadCancelled({ requestId });
    }

    store.trigger.loaded({ requestId, content: loaded });
  }, [contentProvider, loadSeq, store]);

  const content = useSelector(store, (snapshot) => selectContent(snapshot.context));
  const streaming = useSelector(store, (snapshot) => selectStreaming(snapshot.context));
  const error = useSelector(store, (snapshot) => selectError(snapshot.context));
  const providerMarks = useSelector(store, (snapshot) => selectProviderMarks(snapshot.context));
  const status = useSelector(store, (snapshot) => selectStatus(snapshot.context));
  const reload = useCallback(() => store.trigger.reloadRequested({}), [store]);

  return { content, streaming, error, providerMarks, status, reload };
}
