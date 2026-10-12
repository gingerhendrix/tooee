import { useRenderer } from "@opentui/react";
import { useActions, useProvideCommandContext } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import { AppLayout, StatusPriority } from "@tooee/layout";
import { useHasOverlay } from "@tooee/overlays";
import { useThemeCommands, useQuitCommand, usePasteCommands } from "@tooee/shell";
import { useTheme } from "@tooee/themes";
import type { ReactNode } from "react";

import { AskEditor } from "./ask-editor.js";
import { buildAskHints } from "./ask-panel.js";
import type { AskOptions } from "./types.js";
import { useAskEditor } from "./use-ask-editor.js";

export interface AskProps extends AskOptions {
  actions?: ActionDefinition[];
  /**
   * Called with the submitted text. Without a callback, submission destroys
   * the renderer. An action with the id `submit` is an ordinary command: it
   * runs from the palette or its hotkey, and Enter still calls this callback.
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
  const { theme } = useTheme();
  const { name: themeName } = useThemeCommands();
  useQuitCommand();

  // Legacy overlays don't push a command surface; keep blurring the editor
  // under them via the shell's overlay state.
  const hasOverlay = useHasOverlay();

  const handleSubmit = (text: string) => {
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
          { id: "mode", label: "Mode:", priority: StatusPriority.position, value: mode },
          { id: "theme", label: "Theme:", priority: StatusPriority.background, value: themeName },
          {
            compact: { value: mode === "insert" ? "Esc commands" : ": palette" },
            id: "hints",
            label: "",
            priority: StatusPriority.hint,
            value: hintParts.join("  "),
          },
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
