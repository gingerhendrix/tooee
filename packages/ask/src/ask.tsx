import { useRenderer } from "@opentui/react";
import { AppLayout } from "@tooee/layout";
import { useHasOverlay } from "@tooee/overlays";
import { useTheme } from "@tooee/themes";
import { useThemeCommands, useQuitCommand, usePasteCommands } from "@tooee/shell";
import { useActions, useProvideCommandContext, useCommandContext } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import type { AskOptions } from "./types.js";
import { AskEditor } from "./ask-editor.js";
import { useAskEditor } from "./use-ask-editor.js";

export interface AskProps extends AskOptions {
  actions?: ActionDefinition[];
  /**
   * Called with the submitted text. Defaults to writing the value to stdout
   * and destroying the renderer (the standalone `ask` CLI behaviour). A
   * `submit` action takes precedence over both.
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
}: AskProps): React.ReactNode {
  const renderer = useRenderer();
  const { invoke } = useCommandContext();

  const { theme } = useTheme();
  const { name: themeName } = useThemeCommands();
  useQuitCommand({
    onQuit: () => {
      renderer.destroy();
      process.exit(0);
    },
  });

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
    process.stdout.write(`${text}\n`);
    renderer.destroy();
  };

  const { controller, editor } = useAskEditor({
    defaultValue,
    multiline,
    onSubmit: handleSubmit,
    placeholder,
    suspended: hasOverlay,
  });

  useProvideCommandContext(() => ({
    exit: () => {
      renderer.destroy();
    },
  }));

  useActions(actions);

  // Paste commands (available via command palette)
  usePasteCommands({ getTarget: () => controller });

  const mode = editor.mode;
  const submitHint = multiline ? "Shift+Enter submit" : "Enter submit";
  const hintParts =
    mode === "insert"
      ? [submitHint, "Esc commands"]
      : ["i insert", "q quit", ": palette", submitHint];

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
      scrollProps={{ focused: false }}
    >
      <box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        style={{ flexGrow: 1 }}
        onMouseDown={editor.onMouseDown}
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
