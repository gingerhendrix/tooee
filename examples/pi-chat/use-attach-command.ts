/**
 * `@` then Tab in the input opens the attach chooser. The command exists
 * only while an `@` that starts a word sits just before the cursor. At
 * other times Tab goes to the editor as before.
 */

import type { AskEditorController, AskEditorViewModel } from "@tooee/ask";
import { useActions } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";

import { atAttachTrigger, attachInsertText } from "./attach-trigger.js";
import { useFilePicker } from "./use-file-picker.js";

export const ATTACH_HOTKEY = "tab";

const editorTarget = function editorTarget(editor: AskEditorViewModel) {
  return editor.multiline ? editor.textareaRef.current : editor.inputRef.current;
};

export const useAttachCommand = function useAttachCommand(
  controller: AskEditorController,
  editor: AskEditorViewModel
): void {
  const pickFiles = useFilePicker();

  const atTrigger = (): boolean => {
    const target = editorTarget(editor);

    return target !== null && atAttachTrigger(target.plainText, target.cursorOffset);
  };

  const attach = async (): Promise<void> => {
    const paths = await pickFiles();

    if (paths !== null && paths.length > 0) {
      controller.insertText(attachInsertText(paths));
    }
  };

  const actions: ActionDefinition[] = [
    {
      group: "Chat",
      handler: () => {
        void attach();
      },
      hotkey: ATTACH_HOTKEY,
      id: "pi.attach-file",
      modes: ["insert"],
      title: "Attach files (after @)",
      when: atTrigger,
    },
  ];

  useActions(actions);
};
