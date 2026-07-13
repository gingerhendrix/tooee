import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { CommandSurfaceRole, Mode } from "@tooee/commands";

// Types

export type OverlayId = string;

export type OverlayCloseReason = "close" | "escape" | "replaced" | "unmounted";

export type OverlayRole = CommandSurfaceRole;

export interface OverlayOpenOptions {
  /** Mode to set while overlay is active (default: "insert"). null = don't change mode. */
  mode?: Mode | null;
  /** Restore previous mode on close (default: true) */
  restoreMode?: boolean;
  /** Allow Escape to close this overlay (default: true) */
  dismissOnEscape?: boolean;
  /**
   * Mount the overlay as an owned command surface: it gets a local command
   * registry and local mode, and (when `role` is "modal") suspends parent app
   * command dispatch while topmost. When set, the overlay does not mutate the
   * host app's global mode. Overlay commands are registered with `useCommand`
   * inside the overlay's render, exactly like a standalone app.
   */
  ownCommands?: boolean;
  /**
   * Interaction role for an owned command surface (default "modal"). Only
   * meaningful when `ownCommands` is true.
   */
  role?: OverlayRole;
  /** Initial local mode for an owned command surface (default "cursor"). */
  surfaceMode?: Mode;
  /** Lifecycle callback */
  onClose?: (reason: OverlayCloseReason) => void;
}

export interface OverlayRenderArgs<TPayload> {
  id: OverlayId;
  payload: TPayload;
  isTop: boolean;
  close: (reason?: OverlayCloseReason) => void;
  update: (next: TPayload | ((prev: TPayload) => TPayload)) => void;
}

export type OverlayRenderer<TPayload> = (args: OverlayRenderArgs<TPayload>) => ReactNode;

export interface OverlayHandle<TPayload> {
  id: OverlayId;
  close: (reason?: OverlayCloseReason) => void;
  update: (next: TPayload | ((prev: TPayload) => TPayload)) => void;
}

export interface OverlayController {
  open: <TPayload>(
    id: OverlayId,
    render: OverlayRenderer<TPayload>,
    payload: TPayload,
    options?: OverlayOpenOptions,
  ) => OverlayHandle<TPayload>;
  update: <TPayload>(id: OverlayId, next: TPayload | ((prev: TPayload) => TPayload)) => void;
  show: (id: OverlayId, content: ReactNode, options?: OverlayOpenOptions) => void;
  hide: (id: OverlayId) => void;
  closeTop: (reason?: OverlayCloseReason) => void;
  isOpen: (id: OverlayId) => boolean;
  topId: OverlayId | null;
}

export interface OverlayState {
  current: ReactNode | null;
  hasOverlay: boolean;
  /**
   * True when any overlay other than a passive owned surface is open. Passive
   * surfaces (e.g. the which-key hint) render for visuals only and never own
   * input, so they don't count. Use this for guards that should stand down
   * while a modal overlay is up but keep working under passive hints.
   */
  hasModalOverlay: boolean;
  stack: OverlayId[];
}

// Back-compat type (still exported for existing consumers)
export interface OverlayContextValue {
  show: (id: string, content: ReactNode, options?: OverlayOpenOptions) => void;
  hide: (id: string) => void;
  current: ReactNode | null;
  hasOverlay: boolean;
}

// Contexts

const defaultController: OverlayController = {
  closeTop: () => void 0,
  hide: () => void 0,
  isOpen: () => false,
  open: (id) => ({
    close: () => void 0,
    id,
    update: () => void 0,
  }),
  show: () => void 0,
  topId: null,
  update: () => void 0,
};

const defaultState: OverlayState = {
  current: null,
  hasModalOverlay: false,
  hasOverlay: false,
  stack: [],
};

export const OverlayControllerContext = createContext<OverlayController>(defaultController);
export const OverlayStateContext = createContext<OverlayState>(defaultState);

// Back-compat: OverlayContext that combines both (for existing provider consumers)
export const OverlayContext = createContext<OverlayContextValue>({
  current: null,
  hasOverlay: false,
  hide: () => void 0,
  show: () => void 0,
});

// Hooks

export const useOverlay = function useOverlay(): OverlayController {
  return useContext(OverlayControllerContext);
};

export const useOverlayState = function useOverlayState(): OverlayState {
  return useContext(OverlayStateContext);
};

export const useHasOverlay = function useHasOverlay(): boolean {
  return useContext(OverlayStateContext).hasOverlay;
};

export const useHasModalOverlay = function useHasModalOverlay(): boolean {
  return useContext(OverlayStateContext).hasModalOverlay;
};

export const useCurrentOverlay = function useCurrentOverlay(): ReactNode | null {
  return useContext(OverlayStateContext).current;
};
