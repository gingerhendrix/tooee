import type { ActionDefinition } from "@tooee/commands";
import { AppLayout } from "@tooee/layout";
import { useHasOverlay, useHasModalOverlay } from "@tooee/overlays";
import { useThemeCommands, useQuitCommand } from "@tooee/shell";
import { useTheme } from "@tooee/themes";
import { useImperativeHandle } from "react";
import type { ReactNode, Ref } from "react";

import { ChooseFilter } from "./choose-filter.js";
import { ChooseList } from "./choose-list.js";
import type { ChooseListProps } from "./choose-list.js";
import { buildChooseHints } from "./choose-panel.js";
import type { ChooseContentProvider, ChooseOptions, ChooseResult } from "./types.js";
import { useChoose } from "./use-choose.js";
import type { ChooseController } from "./use-choose.js";

export interface ChooseProps extends ChooseOptions {
  contentProvider: ChooseContentProvider;
  actions?: ActionDefinition[];
  controllerRef?: Ref<ChooseController>;
  renderItem?: ChooseListProps["renderItem"];
  /**
   * Called with the selection when the chooser is submitted. This is the
   * component-level equivalent of `useChoose`'s `onSubmit` and is how a host
   * (including `launch()`) receives a `ChooseResult`. An action with the id
   * `submit` is an ordinary command: it runs from the palette or its hotkey,
   * and submitting the chooser still calls this callback.
   */
  onConfirm?: (result: ChooseResult) => void;
  /** Called when the chooser is cancelled (quit, or submit with no selection). */
  onCancel?: () => void;
}

export const Choose = function Choose({
  contentProvider,
  actions,
  controllerRef,
  emptyMessage,
  multi = false,
  onCancel,
  onConfirm,
  placeholder,
  prompt,
  renderItem,
  title,
}: ChooseProps): ReactNode {
  const { theme } = useTheme();
  const { name: themeName } = useThemeCommands();
  useQuitCommand({ onQuit: () => onCancel?.() });

  const hasOverlay = useHasOverlay();
  const hasModalOverlay = useHasModalOverlay();

  const choose = useChoose({
    commands: actions,
    multi,
    onCancel,
    onSubmit: (result) => {
      if (multi || result.items.length > 0) {
        onConfirm?.(result);
      } else {
        onCancel?.();
      }
    },
    source: contentProvider,
    suspended: hasOverlay,
  });

  useImperativeHandle(controllerRef, () => choose.controller, [choose.controller]);

  if (choose.state.loading) {
    return (
      <box>
        <text content="Loading..." fg={theme.textMuted} />
      </box>
    );
  }

  if ((choose.state.error?.length ?? 0) > 0) {
    return (
      <box>
        <text content={`Error: ${choose.state.error}`} fg={theme.error} />
      </box>
    );
  }

  const hints = buildChooseHints(choose.view.mode, { multi });
  let titleBar: { title: string } | undefined;

  if (title !== undefined && title !== "") {
    titleBar = { title };
  } else if (prompt !== undefined && prompt !== "") {
    titleBar = { title: prompt };
  }

  return (
    <AppLayout
      titleBar={titleBar}
      statusBar={{
        items: [
          {
            label: "Matches:",
            value: `${choose.state.matches.length}/${choose.state.items.length}`,
          },
          ...(multi
            ? [
                {
                  label: "Selected:",
                  value: String(choose.state.selectedOriginalIndices.size),
                },
              ]
            : []),
          { label: "Theme:", value: themeName },
          { label: "", value: hints.join("  ") },
        ],
      }}
    >
      <box flexDirection="column" style={{ flexGrow: 1 }}>
        <ChooseFilter choose={choose} placeholder={placeholder} />
        <ChooseList
          choose={choose}
          rowClick="activate"
          renderItem={renderItem}
          emptyContent={emptyMessage}
          suspended={hasModalOverlay}
        />
      </box>
    </AppLayout>
  );
};
