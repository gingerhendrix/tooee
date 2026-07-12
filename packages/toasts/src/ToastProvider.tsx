import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import type { ToastOptions, ToastEntry, ToastController } from "./types.js";

const DEFAULT_DURATIONS: Record<string, number> = {
  error: 5000,
  info: 2000,
  success: 1500,
  warning: 3000,
};

let nextToastId = 0;

const ToastContext = createContext<ToastController | null>(null);

export const ToastProvider = function ToastProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [currentToast, setCurrentToast] = useState<ToastEntry | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setCurrentToast(null);
  }, [clearTimer]);

  const toast = useCallback(
    (options: ToastOptions) => {
      clearTimer();

      const level = options.level ?? "info";
      const duration = options.duration ?? DEFAULT_DURATIONS[level] ?? 2000;
      const id = options.id ?? `toast-${nextToastId}`;
      if (options.id === undefined || options.id === null) {
        nextToastId += 1;
      }

      const entry: ToastEntry = {
        duration,
        id,
        level,
        message: options.message,
      };

      setCurrentToast(entry);

      timerRef.current = setTimeout(() => {
        setCurrentToast((current) => (current?.id === id ? null : current));
        timerRef.current = null;
      }, duration);
    },
    [clearTimer],
  );

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  const controller = useMemo<ToastController>(
    () => ({
      currentToast,
      dismiss,
      toast,
    }),
    [toast, dismiss, currentToast],
  );

  return <ToastContext.Provider value={controller}>{children}</ToastContext.Provider>;
};

export const useToast = function useToast(): ToastController {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};
