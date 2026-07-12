import { useImperativeHandle, type ReactNode, type Ref } from "react";
import { useActions, type ActionDefinition } from "@tooee/commands";
import { AskEditor } from "./AskEditor.js";
import { AskPanel, type AskPanelProps } from "./AskPanel.js";
import { useAskEditor, type AskEditorController } from "./use-ask-editor.js";

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

export function AskOverlay({
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
}: AskOverlayProps) {
  const { controller, editor } = useAskEditor({
    multiline,
    defaultValue,
    placeholder,
    onSubmit,
    onCancel,
    commandScope: "ask-overlay",
  });

  useImperativeHandle(controllerRef, () => controller, [controller]);
  useActions(commands);

  return (
    <>
      <AskPanel
        title={title ?? prompt}
        prompt={title !== undefined ? prompt : undefined}
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
}
