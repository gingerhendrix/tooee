import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react"
import type { ReactNode } from "react"
import type { ToastOptions, ToastEntry, ToastController } from "./types.js"

const DEFAULT_DURATIONS: Record<string, number> = {
  info: 2000,
  success: 1500,
  warning: 3000,
  error: 5000,
}

let nextToastId = 0

const ToastContext = createContext<ToastController | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [currentToast, setCurrentToast] = useState<ToastEntry | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    clearTimer()
    setCurrentToast(null)
  }, [clearTimer])

  const toast = useCallback(
    (options: ToastOptions) => {
      clearTimer()

      const level = options.level ?? "info"
      const duration = options.duration ?? DEFAULT_DURATIONS[level] ?? 2000
      const id = options.id ?? `toast-${nextToastId++}`

      const entry: ToastEntry = {
        id,
        message: options.message,
        level,
        duration,
      }

      setCurrentToast(entry)

      timerRef.current = setTimeout(() => {
        setCurrentToast((current) => (current?.id === id ? null : current))
        timerRef.current = null
      }, duration)
    },
    [clearTimer],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  const controller: ToastController = {
    toast,
    dismiss,
    currentToast,
  }

  return <ToastContext.Provider value={controller}>{children}</ToastContext.Provider>
}

export function useToast(): ToastController {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return ctx
}
