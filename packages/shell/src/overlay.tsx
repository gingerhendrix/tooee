import { useState, useCallback, useMemo, useRef, Fragment } from "react"
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
import {
  useMode,
  useSetMode,
  useProvideCommandContext,
  useCommand,
  CommandSurfaceProvider,
} from "@tooee/commands"
import type { CommandSurfaceRole, Mode } from "@tooee/commands"

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

      // Owned command surfaces keep their mode local; the host mode was never
      // mutated on open, so there is nothing to restore.
      if (!entry.options.ownCommands && entry.options.restoreMode !== false) {
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
      // Owned command surfaces carry their own local mode and never touch the
      // host's global mode.
      const overlayMode = options.ownCommands
        ? null
        : options.mode === undefined
          ? "insert"
          : options.mode

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
    modes: ["insert", "cursor", "select"],
    hidden: true,
    when: () => {
      const current = stackRef.current
      const top = current.length > 0 ? current[current.length - 1] : null
      return top !== null && top.options.dismissOnEscape !== false
    },
    handler: () => closeTop("escape"),
  })

  const current =
    stack.length > 0 ? (
      <>
        {stack.map((entry, index) => {
          const isTop = index === stack.length - 1
          let node = entry.render({
            id: entry.id,
            payload: entry.payload,
            isTop,
            close: (reason: OverlayCloseReason = "close") => removeEntry(entry.id, reason),
            update: (next: any) => update(entry.id, next),
          })

          // An overlay that owns its commands is mounted as a command surface:
          // its children bind to a local registry/mode, and modal surfaces
          // suspend parent command dispatch while topmost. Passive surfaces stay
          // mounted for visuals/help without becoming the keyboard owner.
          if (entry.options.ownCommands && node != null) {
            node = (
              <CommandSurfaceProvider
                id={entry.id}
                role={(entry.options.role as CommandSurfaceRole) ?? "modal"}
                initialMode={(entry.options.surfaceMode as Mode) ?? "cursor"}
              >
                {node}
              </CommandSurfaceProvider>
            )
          }

          // Wrap each entry in a keyed Fragment rather than a layout box. A box
          // would become the containing block for the overlay's own absolute/
          // percentage positioning (e.g. left="20%", maxHeight="60%",
          // bottom={1}); since the overlay node is out of normal flow, that box
          // collapses to zero size and the overlay collapses with it. A Fragment
          // adds no layout node, so each overlay positions against the host's
          // overlay container (AppLayout) exactly as it did before the stack
          // change. Stacked absolutely-positioned overlays overlap, preserving
          // covered overlays and passive-over-modal rendering.
          return <Fragment key={entry.id}>{node}</Fragment>
        })}
      </>
    ) : null

  const state = {
    current,
    hasOverlay: stack.length > 0,
    stack: stack.map((e) => e.id),
  }

  return (
    <OverlayControllerContext value={controller}>
      <OverlayStateContext value={state}>{children}</OverlayStateContext>
    </OverlayControllerContext>
  )
}
