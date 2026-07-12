import type { ReactNode } from "react";
import type { ActionDefinition } from "@tooee/commands";
import type { StatusBarItem } from "@tooee/layout";
import type { MarkSet } from "@tooee/marks";
import { DocumentScreen } from "@tooee/shell";
import type { DocumentController } from "@tooee/shell";
import { useProvideViewCommandContext } from "../hooks/useViewCommandContext.js";
import type { AnyContent } from "../types.js";

export interface ViewScreenProps<T> {
  content: AnyContent;
  controller: DocumentController<T>;
  streaming: boolean;
  actions?: ActionDefinition[];
  /** Content-shaped status (format, line/row counts), rendered before Mode. */
  statusItems?: StatusBarItem[];
  reload: () => void;
  providerMarks: MarkSet[];
  userMarks: MarkSet[];
  setMarkSet: (set: MarkSet) => void;
  clearMarkNamespace: (namespace: string) => void;
  clearAllUserMarks: () => void;
  children: ReactNode;
}

/**
 * The chrome every subview shares: `DocumentScreen` for the row-document half
 * (theme/quit commands, actions, `ctx.document`, layout, standard status) plus
 * the content-only `ctx.view` slice that viewers contribute on top.
 */
export const ViewScreen = function ViewScreen<T>({
  content,
  controller,
  streaming,
  actions,
  statusItems,
  reload,
  providerMarks,
  userMarks,
  setMarkSet,
  clearMarkNamespace,
  clearAllUserMarks,
  children,
}: ViewScreenProps<T>): ReactNode {
  useProvideViewCommandContext({
    content,
    marks: {
      clearAll: clearAllUserMarks,
      clearNamespace: clearMarkNamespace,
      providerMarks,
      setMarkSet,
      userMarks,
    },
    reload,
  });

  const items: StatusBarItem[] = [
    ...(statusItems ?? []),
    ...(streaming ? [{ label: "Status:", value: "streaming" }] : []),
  ];

  return (
    <DocumentScreen
      controller={controller}
      titleBar={
        content.title
          ? { subtitle: content.format, title: content.title }
          : { title: content.format }
      }
      statusItems={items}
      actions={actions}
      context={{ kind: content.format, reload, title: content.title }}
    >
      {children}
    </DocumentScreen>
  );
};
