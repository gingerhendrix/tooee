import { useImperativeHandle } from "react";
import type { Ref } from "react";
import { AppLayout } from "@tooee/layout";
import { useHasOverlay, useHasModalOverlay } from "@tooee/overlays";
import { useTheme } from "@tooee/themes";
import { useThemeCommands, useQuitCommand } from "@tooee/shell";
import { useCommandContext } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import { ChooseFilter } from "./ChooseFilter.js";
import { ChooseList } from "./ChooseList.js";
import type { ChooseListProps } from "./ChooseList.js";
import { buildChooseHints } from "./ChoosePanel.js";
import type { ChooseContentProvider, ChooseOptions, ChooseResult } from "./types.js";
import { useChoose } from "./use-choose.js";
import type { ChooseController } from "./use-choose.js";

export interface ChooseProps {
  contentProvider: ChooseContentProvider;
  options?: ChooseOptions;
  /** Legacy name retained for source compatibility. */
  actions?: ActionDefinition[];
  /** Additive alias used by new chooser compositions. */
  commands?: ActionDefinition[];
  controllerRef?: Ref<ChooseController>;
  renderItem?: ChooseListProps["renderItem"];
  /** @deprecated Prefer commands with an id such as `submit`. */
  onConfirm?: (result: ChooseResult) => void;
  /** @deprecated Prefer commands or launch lifecycle handling. */
  onCancel?: () => void;
}

export const Choose = function Choose({
  contentProvider,
  options,
  actions,
  commands,
  controllerRef,
  renderItem,
  onConfirm,
  onCancel,
}: ChooseProps): React.ReactNode {
  const { theme } = useTheme();
  const { invoke } = useCommandContext();
  const effectiveCommands = commands ?? actions;
  const multi = options?.multi ?? false;

  const { name: themeName } = useThemeCommands();
  useQuitCommand({ onQuit: () => onCancel?.() });

  const hasOverlay = useHasOverlay();
  const hasModalOverlay = useHasModalOverlay();

  const choose = useChoose({
    commands: effectiveCommands,
    multi,
    onCancel,
    onSubmit: (result) => {
      // Historical standalone behaviour: a command named `submit` wins over
      // the deprecated callback, so existing action-driven CLIs are unchanged.
      if (effectiveCommands?.some((action) => action.id === "submit")) {
        invoke("submit");
        return;
      }
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

  if (choose.state.error) {
    return (
      <box>
        <text content={`Error: ${choose.state.error}`} fg={theme.error} />
      </box>
    );
  }

  const hints = buildChooseHints(choose.view.mode, { multi });

  return (
    <AppLayout
      titleBar={
        (options?.title ?? options?.prompt)
          ? { title: (options.title ?? options.prompt)! }
          : undefined
      }
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
      scrollProps={{ focused: false }}
    >
      <box flexDirection="column" style={{ flexGrow: 1 }}>
        <ChooseFilter choose={choose} placeholder={options?.placeholder} />
        <ChooseList
          choose={choose}
          rowClick="activate"
          renderItem={renderItem}
          emptyContent={options?.emptyMessage}
          suspended={hasModalOverlay}
        />
      </box>
    </AppLayout>
  );
};
