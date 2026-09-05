import { useImperativeHandle } from "react";
import type { ReactNode, Ref } from "react";
import { AppLayout } from "@tooee/layout";
import { useHasOverlay, useHasModalOverlay } from "@tooee/overlays";
import { useTheme } from "@tooee/themes";
import { useThemeCommands, useQuitCommand } from "@tooee/shell";
import { useCommandContext } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import { ChooseFilter } from "./choose-filter.js";
import { ChooseList } from "./choose-list.js";
import type { ChooseListProps } from "./choose-list.js";
import { buildChooseHints } from "./choose-panel.js";
import type { ChooseContentProvider, ChooseOptions, ChooseResult } from "./types.js";
import { useChoose } from "./use-choose.js";
import type { ChooseController } from "./use-choose.js";

export interface ChooseProps extends ChooseOptions {
  contentProvider: ChooseContentProvider;
  /** @deprecated Pass chooser options as top-level props. This alias will be removed in 0.9.0. */
  options?: ChooseOptions;
  actions?: ActionDefinition[];
  /** @deprecated Use `actions`. This alias will be removed in 0.9.0. */
  commands?: ActionDefinition[];
  controllerRef?: Ref<ChooseController>;
  renderItem?: ChooseListProps["renderItem"];
  /**
   * Called with the selection when the chooser is submitted. This is the
   * component-level equivalent of `useChoose`'s `onSubmit` and is how a host
   * (including `launch()`) receives a `ChooseResult`. A registered command with
   * the id `submit` still takes precedence, because a command can express its
   * own submit behaviour — but commands receive a `CommandContext`, not a
   * result, so they are not a replacement for this callback.
   */
  onConfirm?: (result: ChooseResult) => void;
  /** Called when the chooser is cancelled (quit, or submit with no selection). */
  onCancel?: () => void;
}

interface ResolvedChooseProps extends ChooseOptions {
  actions?: ActionDefinition[];
}

const resolveChooseProps = function resolveChooseProps(props: ChooseProps): ResolvedChooseProps {
  // oxlint-disable-next-line typescript/no-deprecated -- compatibility alias remains supported until 0.9.0
  const { options } = props;
  // oxlint-disable-next-line typescript/no-deprecated -- compatibility alias remains supported until 0.9.0
  const { commands } = props;
  return {
    actions: props.actions ?? commands,
    emptyMessage: props.emptyMessage ?? options?.emptyMessage,
    multi: props.multi ?? options?.multi,
    placeholder: props.placeholder ?? options?.placeholder,
    prompt: props.prompt ?? options?.prompt,
    title: props.title ?? options?.title,
  };
};

export const Choose = function Choose(props: ChooseProps): ReactNode {
  const { contentProvider, controllerRef, renderItem, onConfirm, onCancel } = props;
  const {
    actions: effectiveActions,
    emptyMessage,
    multi = false,
    placeholder,
    prompt,
    title,
  } = resolveChooseProps(props);
  const { theme } = useTheme();
  const { invoke } = useCommandContext();

  const { name: themeName } = useThemeCommands();
  useQuitCommand({ onQuit: () => onCancel?.() });

  const hasOverlay = useHasOverlay();
  const hasModalOverlay = useHasModalOverlay();

  const choose = useChoose({
    commands: effectiveActions,
    multi,
    onCancel,
    onSubmit: (result) => {
      // Standalone behaviour: a command named `submit` wins over `onConfirm`, so
      // action-driven CLIs keep their own submit semantics.
      if (effectiveActions?.some((action) => action.id === "submit") === true) {
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
