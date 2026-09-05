import { useMemo } from "react";
import type { ReactNode } from "react";
import type { ActionDefinition } from "@tooee/commands";
import { useOverlayDialog } from "@tooee/overlays";
import { ChooseOverlay } from "./choose-overlay.js";
import type { ChooseListProps } from "./choose-list.js";
import type { ChoosePanelProps } from "./choose-panel.js";
import type { ChooseItem, ChooseSource } from "./types.js";

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

const isDialogItemArray = function isDialogItemArray<T>(
  items: ChooseDialogItems<T>,
): items is readonly T[] {
  return Array.isArray(items);
};

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- T carries the conditional public option evidence for an omitted mapper
const defaultDialogItem = function defaultDialogItem<T>(item: T): ChooseItem {
  // SAFETY: ChooseDialogToItem permits an omitted mapper only when T extends ChooseItem.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- conditional public options enforce the ChooseItem arm
  return item as ChooseItem;
};

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
  const dialog = useOverlayDialog<T | T[]>();
  return useMemo<ChooseDialogHandle<T>>(() => {
    const open = async (
      options: ChooseDialogOptionsBase<T> & { toItem?: (item: T) => ChooseItem },
    ): Promise<T | T[] | null> => {
      // Displayed rows map back to typed items by identity: every mapped
      // row is a fresh object (spread copy), so duplicates in `items` and
      // `toItem` results that share references stay unambiguous.
      const toItem = options.toItem ?? defaultDialogItem;
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
      const source: ChooseSource = isDialogItemArray(items)
        ? mapValues(items)
        : (): ChooseItem[] | Promise<ChooseItem[]> => {
            const loaded = items();
            if (loaded instanceof Promise) {
              return (async () => mapValues(await loaded))();
            }
            return mapValues(loaded);
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

      return await dialog.open(
        "choose-dialog",
        (settle): ReactNode =>
          multi ? (
            <ChooseOverlay
              {...shared}
              multi
              onSubmit={(result) => {
                const values = result.items.flatMap((row) => {
                  const value = rowToValue.get(row);
                  return value === undefined ? [] : [value];
                });
                settle(values);
              }}
              onCancel={() => {
                settle(null);
              }}
            />
          ) : (
            <ChooseOverlay
              {...shared}
              onSelect={(row) => {
                const value = rowToValue.get(row);
                settle(value ?? null);
              }}
              onCancel={() => {
                settle(null);
              }}
            />
          ),
      );
    };

    // SAFETY: The implementation returns the single or multi result selected by the same options.multi
    // discriminator as the public overloads.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- implementation preserves the public overloaded handle contract
    return { open: open as ChooseDialogHandle<T>["open"] };
  }, [dialog]);
};
