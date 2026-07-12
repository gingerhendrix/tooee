import { useImperativeHandle } from "react";
import type { ReactNode, Ref } from "react";
import { useActions } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import { AskEditor } from "./ask-editor.js";
import { AskPanel } from "./ask-panel.js";
import type { AskPanelProps } from "./ask-panel.js";
import { useAskEditor } from "./use-ask-editor.js";
import type { AskEditorController } from "./use-ask-editor.js";

export interface AskOverlayProps {
  prompt: string;
  /** Title bar content; when set, `prompt` renders as a line above the editor. */
  title?: string;
  multiline?: boolean;
  defaultValue?: string;
  placeholder?: string;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel: () => void;
  /** Extra commands registered on this surface (same shape as Ask's actions). */
  commands?: ActionDefinition[];
  /** Access to the text controller (dictation, prefill, transforms). */
  controllerRef?: Ref<AskEditorController>;
  /** Chrome pass-throughs. */
  hints?: AskPanelProps["hints"];
  statusRight?: ReactNode;
  footer?: ReactNode;
  inset?: AskPanelProps["inset"];
  /** Nested overlays (pickers) rendered above the panel. */
  children?: ReactNode;
}

export const AskOverlay = function AskOverlay({
  prompt,
  title,
  multiline,
  defaultValue,
  placeholder,
  onSubmit,
  onCancel,
  commands,
  controllerRef,
  hints,
  statusRight,
  footer,
  inset,
  children,
}: AskOverlayProps): ReactNode {
  const { controller, editor } = useAskEditor({
    commandScope: "ask-overlay",
    defaultValue,
    multiline,
    onCancel,
    onSubmit,
    placeholder,
  });

  useImperativeHandle(controllerRef, () => controller, [controller]);
  useActions(commands);

  return (
    <>
      <AskPanel
        title={title ?? prompt}
        prompt={title === undefined ? undefined : prompt}
        multiline={multiline === true}
        hints={hints}
        statusRight={statusRight}
        footer={footer}
        onClose={onCancel}
        inset={inset}
        onMouseDown={editor.onMouseDown}
      >
        <AskEditor editor={editor} />
      </AskPanel>
      {children}
    </>
  );
};
