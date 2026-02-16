import { useState, useCallback, useMemo, useRef } from "react"
import type { ReactNode } from "react"
import {
  OverlayControllerContext,
  OverlayStateContext,
  type OverlayId,
  type OverlayCloseReason,
  type OverlayOpenOptions,
  type OverlayRenderer,
  type OverlayHandle,
  type OverlayController,
} from "@tooee/overlays"
import { useMode, useSetMode, useProvideCommandContext, useCommand } from "@tooee/commands"

declare module "@tooee/commands" {
  interface CommandContext {
    overlay: OverlayController
  }
}

interface OverlayEntry {
  id: OverlayId
  render: OverlayRenderer<any>
  payload: any
  options: OverlayOpenOptions
  prevMode: string
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<OverlayEntry[]>([])
  const stackRef = useRef(stack)
  stackRef.current = stack

  const mode = useMode()
  const setMode = useSetMode()
  const modeRef = useRef(mode)
  modeRef.current = mode

  const removeEntry = useCallback(
    (id: OverlayId, reason: OverlayCloseReason) => {
      const current = stackRef.current
      const idx = current.findIndex((e) => e.id === id)
      if (idx === -1) return

      const entry = current[idx]
      entry.options.onClose?.(reason)

      setStack((prev) => {
        const i = prev.findIndex((e) => e.id === id)
        if (i === -1) return prev
        const next = [...prev]
        next.splice(i, 1)
        return next
      })

      if (entry.options.restoreMode !== false) {
        setMode(entry.prevMode as any)
      }
    },
    [setMode],
  )

  const open = useCallback(
    <TPayload,>(
      id: OverlayId,
      render: OverlayRenderer<TPayload>,
      payload: TPayload,
      options: OverlayOpenOptions = {},
    ): OverlayHandle<TPayload> => {
      const prevMode = modeRef.current
      const overlayMode = options.mode === undefined ? "insert" : options.mode

      setStack((prev) => {
        // Remove existing entry with same id if present
        const filtered = prev.filter((e) => e.id !== id)
        const entry: OverlayEntry = {
          id,
          render: render as OverlayRenderer<any>,
          payload,
          options,
          prevMode,
        }
        return [...filtered, entry]
      })

      if (overlayMode !== null) {
        setMode(overlayMode as any)
      }

      const handle: OverlayHandle<TPayload> = {
        id,
        close: (reason: OverlayCloseReason = "close") => removeEntry(id, reason),
        update: (next: TPayload | ((prev: TPayload) => TPayload)) => {
          setStack((prev) => {
            const idx = prev.findIndex((e) => e.id === id)
            if (idx === -1) return prev
            const entry = prev[idx]
            const newPayload =
              typeof next === "function" ? (next as (p: TPayload) => TPayload)(entry.payload) : next
            const updated = [...prev]
            updated[idx] = { ...entry, payload: newPayload }
            return updated
          })
        },
      }

      return handle
    },
    [setMode, removeEntry],
  )

  const update = useCallback(
    <TPayload,>(id: OverlayId, next: TPayload | ((prev: TPayload) => TPayload)) => {
      setStack((prev) => {
        const idx = prev.findIndex((e) => e.id === id)
        if (idx === -1) return prev
        const entry = prev[idx]
        const newPayload =
          typeof next === "function" ? (next as (p: TPayload) => TPayload)(entry.payload) : next
        const updated = [...prev]
        updated[idx] = { ...entry, payload: newPayload }
        return updated
      })
    },
    [],
  )

  const show = useCallback(
    (id: OverlayId, content: ReactNode, options?: OverlayOpenOptions) => {
      // Back-compat: show() defaults to no mode change (unlike open() which defaults to "insert")
      open(id, () => content, undefined, { mode: null, ...options })
    },
    [open],
  )

  const hide = useCallback(
    (id: OverlayId) => {
      removeEntry(id, "close")
    },
    [removeEntry],
  )

  const closeTop = useCallback(
    (reason: OverlayCloseReason = "close") => {
      const current = stackRef.current
      if (current.length === 0) return
      const top = current[current.length - 1]
      removeEntry(top.id, reason)
    },
    [removeEntry],
  )

  const isOpen = useCallback((id: OverlayId) => {
    return stackRef.current.some((e) => e.id === id)
  }, [])

  const topId = stack.length > 0 ? stack[stack.length - 1].id : null

  const controller = useMemo<OverlayController>(
    () => ({
      open,
      update,
      show,
      hide,
      closeTop,
      isOpen,
      topId,
    }),
    [open, update, show, hide, closeTop, isOpen, topId],
  )

  useProvideCommandContext(() => ({
    overlay: {
      open: controller.open,
      show: controller.show,
      hide: controller.hide,
      update: controller.update,
      closeTop: controller.closeTop,
      isOpen: controller.isOpen,
      topId: controller.topId,
    },
  }))

  useCommand({
    id: "overlay.close-top",
    title: "Close overlay",
    hotkey: "Escape",
    modes: ["insert"],
    hidden: true,
    when: () => topId !== null,
    handler: () => closeTop("escape"),
  })

  // Render the topmost overlay
  const topEntry = stack.length > 0 ? stack[stack.length - 1] : null
  const current = topEntry
    ? topEntry.render({
        id: topEntry.id,
        payload: topEntry.payload,
        isTop: true,
        close: (reason: OverlayCloseReason = "close") => removeEntry(topEntry.id, reason),
        update: (next: any) => update(topEntry.id, next),
      })
    : null

  const state = useMemo(
    () => ({
      current,
      hasOverlay: stack.length > 0,
      stack: stack.map((e) => e.id),
    }),
    [current, stack],
  )

  return (
    <OverlayControllerContext value={controller}>
      <OverlayStateContext value={state}>{children}</OverlayStateContext>
    </OverlayControllerContext>
  )
}
