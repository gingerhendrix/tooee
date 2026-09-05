import { useMemo } from "react";
import type { ReactNode, Ref } from "react";
import type { ActionDefinition } from "@tooee/commands";
import { useOverlayDialog } from "@tooee/overlays";
import { AskOverlay } from "./ask-overlay.js";
import type { AskPanelProps } from "./ask-panel.js";
import type { AskEditorController } from "./use-ask-editor.js";

export interface AskDialogOptions {
  prompt: string;
  /** Title bar content; when set, `prompt` renders as a line above the editor. */
  title?: string;
  multiline?: boolean;
  defaultValue?: string;
  placeholder?: string;
  /**
   * Extra commands registered on the dialog's own command surface (same shape
   * as Ask's actions). Handlers may open further dialogs; the nested dialog
   * suspends this one until it settles.
   */
  commands?: ActionDefinition[];
  /** Access to the text controller while open (dictation, prefill, transforms). */
  controllerRef?: Ref<AskEditorController>;
  /** Chrome pass-throughs (see AskOverlay). */
  hints?: AskPanelProps["hints"];
  statusRight?: ReactNode;
  footer?: ReactNode;
  inset?: AskPanelProps["inset"];
}

export interface AskDialogHandle {
  /**
   * Open a modal ask dialog and resolve with the submitted text, or `null`
   * when the dialog is cancelled, replaced, or unmounted. Settles exactly
   * once per call.
   */
  open: (options: AskDialogOptions) => Promise<string | null>;
}

/**
 * Promise-based modal ask dialog on the overlay stack.
 *
 * Each `open()` owns one modal overlay record and one owned command surface
 * (via `ownCommands`), so the host app's commands are suspended and its global
 * mode is never touched while the dialog is up. The returned promise settles
 * exactly once: with the submitted string, or with `null` on cancel (`q` in
 * cursor mode or the close button), same-id replacement, or unmount of the
 * owning component.
 *
 * The overlay renders wherever the host presents overlay content
 * (`AppLayout` does this automatically; custom hosts render
 * `useCurrentOverlay()`).
 */
export const useAskDialog = function useAskDialog(): AskDialogHandle {
  const dialog = useOverlayDialog<string>();
  return useMemo<AskDialogHandle>(
    () => ({
      open: async (options) =>
        await dialog.open(
          "ask-dialog",
          (settle): ReactNode => (
            <AskOverlay
              prompt={options.prompt}
              title={options.title}
              multiline={options.multiline}
              defaultValue={options.defaultValue}
              placeholder={options.placeholder}
              commands={options.commands}
              controllerRef={options.controllerRef}
              hints={options.hints}
              statusRight={options.statusRight}
              footer={options.footer}
              inset={options.inset}
              onSubmit={(value) => {
                settle(value);
              }}
              onCancel={() => {
                settle(null);
              }}
            />
          ),
        ),
    }),
    [dialog],
  );
};
