import { useActions, useMode } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import { AppLayout, StatusPriority } from "@tooee/layout";
import type { AppLayoutProps, StatusBarItem } from "@tooee/layout";
import type { ReactNode } from "react";

import { useQuitCommand, useThemeCommands } from "../commands.js";
import type { UseQuitCommandOptions } from "../commands.js";
import { useProvideDocumentCommandContext } from "./command-context.js";
import type { ProvideDocumentCommandContextOptions } from "./command-context.js";
import type { DocumentController } from "./types.js";

export interface DocumentScreenProps<T> {
  controller: DocumentController<T>;
  titleBar?: AppLayoutProps["titleBar"];
  /** Domain status, rendered after Theme. Mode and Cursor sit at the right edge. */
  statusItems?: readonly StatusBarItem[];
  actions?: ActionDefinition[];
  quit?: boolean | UseQuitCommandOptions;
  themeCommands?: boolean;
  context?: ProvideDocumentCommandContextOptions;
  /** Optional side region beside the document, such as an outline panel. */
  aside?: AppLayoutProps["aside"];
  children: ReactNode;
}

/**
 * Standard chrome for a row-document screen: actions, theme and quit commands,
 * `ctx.document`, the app layout, and the standard status items. Router
 * commands, domain status, data loading, and row rendering stay with the app.
 */
export const DocumentScreen = function DocumentScreen<T>({
  controller,
  titleBar,
  statusItems,
  actions,
  quit = true,
  themeCommands = true,
  context,
  aside,
  children,
}: DocumentScreenProps<T>): ReactNode {
  const mode = useMode();

  const { name: themeName } = useThemeCommands({ enabled: themeCommands });
  let quitOptions: UseQuitCommandOptions;

  if (quit === true) {
    quitOptions = { enabled: true };
  } else if (quit === false) {
    quitOptions = { enabled: false };
  } else {
    quitOptions = quit;
  }

  useQuitCommand(quitOptions);
  useActions(actions);
  useProvideDocumentCommandContext(controller, context);

  const { search, navigation, toggledIndices } = controller;
  let selectionCount = toggledIndices.size;

  if (selectionCount === 0 && navigation.selection) {
    selectionCount = navigation.selection.end - navigation.selection.start + 1;
  }

  const items: StatusBarItem[] = [
    { id: "theme", label: "Theme:", priority: StatusPriority.background, value: themeName },
    ...(statusItems ?? []),
    ...(selectionCount > 0
      ? [
          {
            id: "selected",
            label: "Selected:",
            priority: StatusPriority.focus,
            value: String(selectionCount),
          },
        ]
      : []),
    { align: "end", id: "mode", label: "Mode:", priority: StatusPriority.position, value: mode },
    {
      align: "end",
      compact: { label: "Ln" },
      id: "cursor",
      label: "Cursor:",
      priority: StatusPriority.position,
      value: controller.activeIndex === null ? "-" : String(controller.activeIndex),
    },
  ];

  return (
    <AppLayout
      titleBar={titleBar}
      statusBar={{ items }}
      searchBar={search ?? undefined}
      aside={aside}
    >
      {children}
    </AppLayout>
  );
};
