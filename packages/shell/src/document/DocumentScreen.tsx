import type { ReactNode } from "react";
import { useActions, useMode } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import { AppLayout } from "@tooee/layout";
import type { AppLayoutProps, StatusBarItem } from "@tooee/layout";
import { useQuitCommand, useThemeCommands } from "../commands.js";
import type { UseQuitCommandOptions } from "../commands.js";
import { useProvideDocumentCommandContext } from "./command-context.js";
import type { ProvideDocumentCommandContextOptions } from "./command-context.js";
import type { DocumentController } from "./types.js";

export interface DocumentScreenProps<T> {
  controller: DocumentController<T>;
  titleBar?: AppLayoutProps["titleBar"];
  /** Domain status, rendered between Theme and Mode. */
  statusItems?: readonly StatusBarItem[];
  actions?: ActionDefinition[];
  quit?: boolean | UseQuitCommandOptions;
  themeCommands?: boolean;
  context?: ProvideDocumentCommandContextOptions;
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
  children,
}: DocumentScreenProps<T>): ReactNode {
  const mode = useMode();

  const { name: themeName } = useThemeCommands({ enabled: themeCommands });
  useQuitCommand(typeof quit === "boolean" ? { enabled: quit } : quit);
  useActions(actions);
  useProvideDocumentCommandContext(controller, context);

  const { search, navigation, toggledIndices } = controller;
  const selectionCount =
    toggledIndices.size > 0
      ? toggledIndices.size
      : navigation.selection
        ? navigation.selection.end - navigation.selection.start + 1
        : 0;

  const items: StatusBarItem[] = [
    { label: "Theme:", value: themeName },
    ...(statusItems ?? []),
    { label: "Mode:", value: mode },
    {
      label: "Cursor:",
      value: controller.activeIndex === null ? "-" : String(controller.activeIndex),
    },
    ...(selectionCount > 0 ? [{ label: "Selected:", value: String(selectionCount) }] : []),
    ...(search?.searchActive === true ? [{ label: "Search:", value: search.searchQuery }] : []),
  ];

  return (
    <AppLayout titleBar={titleBar} statusBar={{ items }} searchBar={search ?? undefined}>
      {children}
    </AppLayout>
  );
};
