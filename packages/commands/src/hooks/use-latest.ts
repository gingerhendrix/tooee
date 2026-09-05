import { useRef } from "react";
import type { RefObject } from "react";

/** Returns a stable ref whose current value is refreshed during every render. */
export const useLatest = function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};
