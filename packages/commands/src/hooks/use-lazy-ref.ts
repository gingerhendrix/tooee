import { useRef } from "react";
import type { RefObject } from "react";

/** Returns a stable ref initialized by calling `init` only on the first render. */
export const useLazyRef = function useLazyRef<T>(init: () => T): RefObject<T> {
  const container = useRef<RefObject<T> | null>(null);
  container.current ??= { current: init() };
  return container.current;
};
