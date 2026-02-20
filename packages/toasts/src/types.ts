export type ToastLevel = "info" | "success" | "warning" | "error"

export interface ToastOptions {
  message: string
  level?: ToastLevel
  duration?: number
  id?: string
}

export interface ToastEntry {
  id: string
  message: string
  level: ToastLevel
  duration: number
}

export interface ToastController {
  toast(options: ToastOptions): void
  dismiss(): void
  currentToast: ToastEntry | null
}
