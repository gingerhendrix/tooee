import { useCallback, useMemo, useRef, Fragment } from "react";
import type { ReactNode } from "react";
import { useSelector } from "@xstate/store-react";
import {
  OverlayControllerContext,
  OverlayStateContext,
  createOverlayStore,
  selectStack,
  selectTop,
  type OverlayId,
  type OverlayCloseReason,
  type OverlayOpenOptions,
  type OverlayRenderer,
  type OverlayHandle,
  type OverlayController,
  type OverlayRecord,
  type OverlayStore,
} from "@tooee/overlays";
import {
  useMode,
  useSetMode,
  useProvideCommandContext,
  useCommand,
  useCommandStore,
  CommandSurfaceProvider,
} from "@tooee/commands";
import type { CommandSurfaceRole, Mode } from "@tooee/commands";

declare module "@tooee/commands" {
  interface CommandContext {
    overlay: OverlayController;
  }
}

interface OverlayBridge {
  setMode: (mode: Mode) => void;
  resetSequence: () => void;
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const mode = useMode();
  const setMode = useSetMode();
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const commandStore = useCommandStore();

  // The bridge performs the lifecycle side effects the pure store emits:
  // onClose callbacks, legacy host-mode restoration, and the same-id
  // replacement sequence reset (F-09: replacement without a surface remount
  // is invisible to mount-driven surface registration, so the pending chord
  // must be cleared here). Subscribed at store creation — before any child
  // effect can open an overlay.
  const bridgeRef = useRef<OverlayBridge>({ setMode: () => {}, resetSequence: () => {} });
  const storeRef = useRef<OverlayStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createOverlayStore();
    storeRef.current.on("closed", ({ record, reason, restoreModeTo }) => {
      record.options.onClose?.(reason);
      if (restoreModeTo !== null) {
        bridgeRef.current.setMode(restoreModeTo as Mode);
      }
      if (reason === "replaced") {
        bridgeRef.current.resetSequence();
      }
    });
  }
  const overlayStore = storeRef.current;
  bridgeRef.current.setMode = setMode;
  bridgeRef.current.resetSequence = () => commandStore.reset();

  const stack = useSelector(overlayStore, (s) => selectStack(s.context));

  const removeEntry = useCallback(
    (id: OverlayId, reason: OverlayCloseReason) => {
      overlayStore.trigger.closed({ id, reason });
    },
    [overlayStore],
  );

  const open = useCallback(
    <TPayload,>(
      id: OverlayId,
      render: OverlayRenderer<TPayload>,
      payload: TPayload,
      options: OverlayOpenOptions = {},
    ): OverlayHandle<TPayload> => {
      const prevMode = modeRef.current;
      // Owned command surfaces carry their own local mode and never touch the
      // host's global mode.
      const overlayMode = options.ownCommands
        ? null
        : options.mode === undefined
          ? "insert"
          : options.mode;

      const record: OverlayRecord<TPayload> = { id, render, payload, options, prevMode };
      overlayStore.trigger.opened({ record: record as OverlayRecord });

      if (overlayMode !== null) {
        setMode(overlayMode as Mode);
      }

      const handle: OverlayHandle<TPayload> = {
        id,
        close: (reason: OverlayCloseReason = "close") => removeEntry(id, reason),
        update: (next: TPayload | ((prev: TPayload) => TPayload)) => {
          overlayStore.trigger.updated({ id, next });
        },
      };

      return handle;
    },
    [overlayStore, setMode, removeEntry],
  );

  const update = useCallback(
    <TPayload,>(id: OverlayId, next: TPayload | ((prev: TPayload) => TPayload)) => {
      overlayStore.trigger.updated({ id, next });
    },
    [overlayStore],
  );

  const show = useCallback(
    (id: OverlayId, content: ReactNode, options?: OverlayOpenOptions) => {
      // Back-compat: show() defaults to no mode change (unlike open() which defaults to "insert")
      open(id, () => content, undefined, { mode: null, ...options });
    },
    [open],
  );

  const hide = useCallback(
    (id: OverlayId) => {
      removeEntry(id, "close");
    },
    [removeEntry],
  );

  const closeTop = useCallback(
    (reason: OverlayCloseReason = "close") => {
      overlayStore.trigger.closedTop({ reason });
    },
    [overlayStore],
  );

  const isOpen = useCallback(
    (id: OverlayId) => {
      // Imperative snapshot read (same semantics as the previous ref read).
      return overlayStore.getSnapshot().context.stack.some((e) => e.id === id);
    },
    [overlayStore],
  );

  const topId = stack.length > 0 ? stack[stack.length - 1]!.id : null;

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
  );

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
  }));

  useCommand({
    id: "overlay.close-top",
    title: "Close overlay",
    hotkey: "Escape",
    modes: ["insert", "cursor", "select"],
    hidden: true,
    when: () => {
      const top = selectTop(overlayStore.getSnapshot().context);
      return top !== null && top.options.dismissOnEscape !== false;
    },
    handler: () => closeTop("escape"),
  });

  const current =
    stack.length > 0 ? (
      <>
        {stack.map((entry, index) => {
          const isTop = index === stack.length - 1;
          let node = entry.render({
            id: entry.id,
            payload: entry.payload,
            isTop,
            close: (reason: OverlayCloseReason = "close") => removeEntry(entry.id, reason),
            update: (next: unknown) => update(entry.id, next),
          });

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
            );
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
          return <Fragment key={entry.id}>{node}</Fragment>;
        })}
      </>
    ) : null;

  const state = {
    current,
    hasOverlay: stack.length > 0,
    // Passive owned surfaces (e.g. the which-key hint) render for visuals only
    // and never own input, so they don't count as modal. Everything else —
    // legacy overlays and modal owned surfaces — does.
    hasModalOverlay: stack.some((e) => !(e.options.ownCommands && e.options.role === "passive")),
    stack: stack.map((e) => e.id),
  };

  return (
    <OverlayControllerContext value={controller}>
      <OverlayStateContext value={state}>{children}</OverlayStateContext>
    </OverlayControllerContext>
  );
}
