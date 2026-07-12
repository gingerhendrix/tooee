import { useEffect, useRef } from "react";
import type { ReactNode, Ref } from "react";
import type { ActionDefinition } from "@tooee/commands";
import { useOverlay } from "@tooee/overlays";
import type { OverlayHandle } from "@tooee/overlays";
import { AskOverlay } from "./AskOverlay.js";
import type { AskPanelProps } from "./AskPanel.js";
import type { AskEditorController } from "./use-ask-editor.js";

/**
 * Per-open unique overlay id. A module-level sequence guarantees that
 * concurrent dialogs — including dialogs opened from separate providers in the
 * same process — never share an overlay id, so one dialog can never displace
 * another through same-id replacement.
 */
let askDialogSequence = 0;

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
  open(options: AskDialogOptions): Promise<string | null>;
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
export function useAskDialog(): AskDialogHandle {
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
      for (const handle of handles.values()) handle.close("unmounted");
      handles.clear();
    };
  }, []);

  // Stable identity so command handlers and effects can capture the handle.
  const handleRef = useRef<AskDialogHandle | null>(null);
  if (handleRef.current === null) {
    handleRef.current = {
      open(options: AskDialogOptions): Promise<string | null> {
        return new Promise<string | null>((resolvePromise) => {
          if (unmountedRef.current) {
            resolvePromise(null);
            return;
          }

          const id = `ask-dialog-${++askDialogSequence}`;
          let settled = false;
          const settle = (value: string | null) => {
            if (settled) return;
            settled = true;
            openHandlesRef.current.delete(id);
            resolvePromise(value);
          };

          const handle = overlayRef.current.open(
            id,
            () => (
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
                  if (settled) return;
                  settle(value);
                  handle.close("close");
                }}
                onCancel={() => handle.close("escape")}
              />
            ),
            undefined,
            {
              ownCommands: true,
              role: "modal",
              surfaceMode: "insert",
              // Single settlement funnel: every close path (cancel, escape,
              // replacement, unmount, external closeTop) lands here. Submit
              // settles first, making this a no-op.
              onClose: () => settle(null),
            },
          );
          openHandlesRef.current.set(id, handle);
        });
      },
    };
  }

  return handleRef.current;
}
