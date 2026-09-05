import { useRenderer } from "@opentui/react";
import { AppLayout } from "@tooee/layout";
import { useHasOverlay } from "@tooee/overlays";
import { useTheme } from "@tooee/themes";
import { useThemeCommands, useQuitCommand, usePasteCommands } from "@tooee/shell";
import { useActions, useProvideCommandContext, useCommandContext } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import type { AskOptions } from "./types.js";
import { AskEditor } from "./ask-editor.js";
import { buildAskHints } from "./ask-panel.js";
import { useAskEditor } from "./use-ask-editor.js";
import type { ReactNode } from "react";

export interface AskProps extends AskOptions {
  actions?: ActionDefinition[];
  /**
   * Called with the submitted text. Without a callback, submission destroys
   * the renderer. A `submit` action takes precedence over the callback.
   */
  onSubmit?: (value: string) => void;
}

export const Ask = function Ask({
  title,
  prompt,
  placeholder,
  defaultValue,
  multiline = true,
  actions,
  onSubmit,
}: AskProps): ReactNode {
  const renderer = useRenderer();
  const { invoke } = useCommandContext();

  const { theme } = useTheme();
  const { name: themeName } = useThemeCommands();
  useQuitCommand();

  // Legacy overlays don't push a command surface; keep blurring the editor
  // under them via the shell's overlay state.
  const hasOverlay = useHasOverlay();

  const handleSubmit = (text: string) => {
    if (actions?.some((a) => a.id === "submit") === true) {
      invoke("submit");
      return;
    }
    if (onSubmit) {
      onSubmit(text);
      return;
    }
    renderer.destroy();
  };

  const { controller, editor } = useAskEditor({
    defaultValue,
    multiline,
    onSubmit: handleSubmit,
    placeholder,
    suspended: hasOverlay,
  });
  const handleMouseDown = editor.onMouseDown;

  useProvideCommandContext(() => ({
    exit: () => {
      renderer.destroy();
    },
  }));

  useActions(actions);

  // Paste commands (available via command palette)
  usePasteCommands({ getTarget: () => controller });

  const { mode } = editor;
  const hintParts = buildAskHints(mode, { cursorExtra: [": palette"], multiline });

  return (
    <AppLayout
      titleBar={title !== undefined && title !== "" ? { title } : undefined}
      statusBar={{
        items: [
          { label: "Mode:", value: mode },
          { label: "Theme:", value: themeName },
          { label: "", value: hintParts.join("  ") },
        ],
      }}
    >
      <box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        style={{ flexGrow: 1 }}
        onMouseDown={handleMouseDown}
      >
        <box flexDirection="column" width="100%" maxWidth={80} style={{ flexGrow: 1, padding: 1 }}>
          {(prompt?.length ?? 0) > 0 && (
            <text fg={theme.text} style={{ marginBottom: 1 }}>
              <strong>{prompt}</strong>
            </text>
          )}
          <AskEditor editor={editor} />
        </box>
      </box>
    </AppLayout>
  );
};
