import { createContext, useContext } from "react"
import type { ReactNode } from "react"

// Types

export type OverlayId = string

export type OverlayCloseReason = "close" | "escape" | "replaced" | "unmounted"

export interface OverlayOpenOptions {
  /** Mode to set while overlay is active (default: "insert"). null = don't change mode. */
  mode?: string | null
  /** Restore previous mode on close (default: true) */
  restoreMode?: boolean
  /** Allow Escape to close this overlay (default: true) */
  dismissOnEscape?: boolean
  /** Lifecycle callback */
  onClose?: (reason: OverlayCloseReason) => void
}

export interface OverlayRenderArgs<TPayload> {
  id: OverlayId
  payload: TPayload
  isTop: boolean
  close: (reason?: OverlayCloseReason) => void
  update: (next: TPayload | ((prev: TPayload) => TPayload)) => void
}

export type OverlayRenderer<TPayload> = (args: OverlayRenderArgs<TPayload>) => ReactNode

export interface OverlayHandle<TPayload> {
  id: OverlayId
  close: (reason?: OverlayCloseReason) => void
  update: (next: TPayload | ((prev: TPayload) => TPayload)) => void
}

export interface OverlayController {
  open<TPayload>(id: OverlayId, render: OverlayRenderer<TPayload>, payload: TPayload, options?: OverlayOpenOptions): OverlayHandle<TPayload>
  update<TPayload>(id: OverlayId, next: TPayload | ((prev: TPayload) => TPayload)): void
  show(id: OverlayId, content: ReactNode, options?: OverlayOpenOptions): void
  hide(id: OverlayId): void
  closeTop(reason?: OverlayCloseReason): void
  isOpen(id: OverlayId): boolean
  topId: OverlayId | null
}

export interface OverlayState {
  current: ReactNode | null
  hasOverlay: boolean
  stack: OverlayId[]
}

// Back-compat type (still exported for existing consumers)
export interface OverlayContextValue {
  show: (id: string, content: ReactNode, options?: OverlayOpenOptions) => void
  hide: (id: string) => void
  current: ReactNode | null
  hasOverlay: boolean
}

// Contexts

const defaultController: OverlayController = {
  open: (id) => ({ id, close: () => {}, update: () => {} }),
  update: () => {},
  show: () => {},
  hide: () => {},
  closeTop: () => {},
  isOpen: () => false,
  topId: null,
}

const defaultState: OverlayState = {
  current: null,
  hasOverlay: false,
  stack: [],
}

export const OverlayControllerContext = createContext<OverlayController>(defaultController)
export const OverlayStateContext = createContext<OverlayState>(defaultState)

// Back-compat: OverlayContext that combines both (for existing provider consumers)
export const OverlayContext = createContext<OverlayContextValue>({
  show: () => {},
  hide: () => {},
  current: null,
  hasOverlay: false,
})

// Hooks

export function useOverlay(): OverlayController {
  return useContext(OverlayControllerContext)
}

export function useOverlayState(): OverlayState {
  return useContext(OverlayStateContext)
}

export function useHasOverlay(): boolean {
  return useContext(OverlayStateContext).hasOverlay
}

export function useCurrentOverlay(): ReactNode | null {
  return useContext(OverlayStateContext).current
}
