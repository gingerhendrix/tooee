import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { ActionDefinition } from "@tooee/commands";
import { useOverlay } from "@tooee/overlays";
import type { OverlayHandle } from "@tooee/overlays";
import { ChooseOverlay } from "./choose-overlay.js";
import type { ChooseListProps } from "./choose-list.js";
import type { ChoosePanelProps } from "./choose-panel.js";
import type { ChooseItem, ChooseSource } from "./types.js";

/**
 * Per-open unique overlay id. A module-level sequence guarantees that
 * concurrent dialogs — including dialogs opened from separate providers in the
 * same process — never share an overlay id, so one dialog can never displace
 * another through same-id replacement.
 */
let chooseDialogSequence = 0;

/** Typed item source: a fixed list, or a loader invoked when the dialog opens. */
export type ChooseDialogItems<T> = readonly T[] | (() => readonly T[] | Promise<readonly T[]>);

export interface ChooseDialogOptionsBase<T> {
  items: ChooseDialogItems<T>;
  /** Multi-select: Tab toggles, Enter submits the selection (default false). */
  multi?: boolean;
  prompt?: string;
  placeholder?: string;
  emptyMessage?: string;
  /**
   * Extra commands registered on the dialog's own command surface. Handlers
   * may open further dialogs; the nested dialog suspends this one until it
   * settles.
   */
  commands?: ActionDefinition[];
  /** Chrome pass-throughs (see ChooseOverlay). */
  renderItem?: ChooseListProps["renderItem"];
  hints?: ChoosePanelProps["hints"];
  statusRight?: ReactNode;
  footer?: ReactNode;
  inset?: ChoosePanelProps["inset"];
}

/**
 * Projection from a typed item to the displayed `ChooseItem`. Optional when
 * `T` is itself a `ChooseItem`; required otherwise, which is what keeps the
 * public generic cast-free for arbitrary item types.
 */
export type ChooseDialogToItem<T> = [T] extends [ChooseItem]
  ? { toItem?: (item: T) => ChooseItem }
  : { toItem: (item: T) => ChooseItem };

export type ChooseDialogOptions<T> = ChooseDialogOptionsBase<T> & ChooseDialogToItem<T>;

export interface ChooseDialogHandle<T> {
  /**
   * Open a modal chooser and resolve with the chosen item(s), or `null` when
   * the dialog is cancelled, replaced, or unmounted. Settles exactly once per
   * call. Result shape follows Choose selection semantics: single-select
   * resolves the confirmed item; multi-select resolves the toggled items
   * (falling back to the active item when nothing is toggled).
   */
  open: {
    (options: ChooseDialogOptions<T> & { multi: true }): Promise<T[] | null>;
    (options: ChooseDialogOptions<T> & { multi?: false }): Promise<T | null>;
  };
}

/**
 * Promise-based modal chooser dialog on the overlay stack.
 *
 * Each `open()` owns one modal overlay record and one owned command surface
 * (via `ownCommands`), so the host app's commands are suspended and its global
 * mode is never touched while the dialog is up. The returned promise settles
 * exactly once: with the typed selection, or with `null` on cancel (Escape in
 * cursor mode, `q`, or the close button), same-id replacement, or unmount of
 * the owning component.
 *
 * The overlay renders wherever the host presents overlay content
 * (`AppLayout` does this automatically; custom hosts render
 * `useCurrentOverlay()`).
 */
export const useChooseDialog = function useChooseDialog<T>(): ChooseDialogHandle<T> {
  const overlay = useOverlay();
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  // Open dialogs by overlay id, so unmounting the owner closes (and thereby
  // settles) every dialog it opened.
  const openHandlesRef = useRef(new Map<string, OverlayHandle<undefined>>());
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    const handles = openHandlesRef.current;
    return () => {
      unmountedRef.current = true;
      // Map iteration tolerates deletion: settle() removes entries as each
      // close lands.
      for (const handle of handles.values()) {
        handle.close("unmounted");
      }
      handles.clear();
    };
  }, []);

  // Stable identity so command handlers and effects can capture the handle.
  const handleRef = useRef<ChooseDialogHandle<T> | null>(null);
  if (handleRef.current === null) {
    const open = async (
      options: ChooseDialogOptionsBase<T> & { toItem?: (item: T) => ChooseItem },
    ): Promise<T | T[] | null> =>
      await new Promise<T | T[] | null>((resolvePromise) => {
        if (unmountedRef.current) {
          resolvePromise(null);
          return;
        }

        chooseDialogSequence += 1;
        const id = `choose-dialog-${chooseDialogSequence}`;
        let settled = false;
        const settle = (value: T | T[] | null) => {
          if (settled) {
            return;
          }
          settled = true;
          openHandlesRef.current.delete(id);
          resolvePromise(value);
        };

        // Displayed rows map back to typed items by identity: every mapped
        // row is a fresh object (spread copy), so duplicates in `items` and
        // `toItem` results that share references stay unambiguous.
        // Safe default: `toItem` may only be omitted when T is a ChooseItem
        // (enforced by ChooseDialogToItem).
        // Deferred(lint-sweep): replace the conditional generic API boundary with schema-safe overload implementation typing.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- default mapper is enforced by ChooseDialogToItem's public type
        const toItem = options.toItem ?? ((item: T) => item as unknown as ChooseItem);
        const rowToValue = new Map<ChooseItem, T>();
        const mapValues = (values: readonly T[]): ChooseItem[] => {
          rowToValue.clear();
          return values.map((value) => {
            const row = { ...toItem(value) };
            rowToValue.set(row, value);
            return row;
          });
        };

        // Created once per open() so the source identity is stable across
        // overlay re-renders (a fresh source each render would reload forever).
        const { items } = options;
        const source: ChooseSource = Array.isArray(items)
          ? mapValues(items as readonly T[])
          : (): ChooseItem[] | Promise<ChooseItem[]> => {
              // Deferred(lint-sweep): replace the conditional generic API boundary with schema-safe overload implementation typing.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- implementation narrows the public source union after the branch
              const loaded = (items as () => readonly T[] | Promise<readonly T[]>)();
              return loaded instanceof Promise ? loaded.then(mapValues) : mapValues(loaded);
            };

        const multi = options.multi === true;
        const shared = {
          commands: options.commands,
          emptyMessage: options.emptyMessage,
          footer: options.footer,
          hints: options.hints,
          inset: options.inset,
          items: source,
          placeholder: options.placeholder,
          prompt: options.prompt,
          renderItem: options.renderItem,
          statusRight: options.statusRight,
        };

        const handle = overlayRef.current.open(
          id,
          (): ReactNode =>
            multi ? (
              <ChooseOverlay
                {...shared}
                multi
                onSubmit={(result) => {
                  if (settled) {
                    return;
                  }
                  const values = result.items.flatMap((row) => {
                    const value = rowToValue.get(row);
                    return value === undefined ? [] : [value];
                  });
                  settle(values);
                  handle.close("close");
                }}
                onCancel={() => {
                  handle.close("escape");
                }}
              />
            ) : (
              <ChooseOverlay
                {...shared}
                onSelect={(row) => {
                  if (settled) {
                    return;
                  }
                  const value = rowToValue.get(row);
                  settle(value === undefined ? null : value);
                  handle.close("close");
                }}
                onCancel={() => {
                  handle.close("escape");
                }}
              />
            ),
          undefined,
          {
            // Single settlement funnel: every close path (cancel, escape,
            // replacement, unmount, external closeTop) lands here. Select and
            // submit settle first, making this a no-op.
            onClose: () => {
              settle(null);
            },
            ownCommands: true,
            role: "modal",
            surfaceMode: "insert",
          },
        );
        openHandlesRef.current.set(id, handle);
      });

    // Deferred(lint-sweep): replace the conditional generic API boundary with schema-safe overload implementation typing.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- implementation preserves the public overloaded handle contract
    handleRef.current = { open: open as ChooseDialogHandle<T>["open"] };
  }

  return handleRef.current;
};
