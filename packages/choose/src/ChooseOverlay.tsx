import { useImperativeHandle } from "react";
import type { ReactNode, Ref } from "react";
import type { ActionDefinition } from "@tooee/commands";
import { ChooseFilter } from "./ChooseFilter.js";
import { ChooseList } from "./ChooseList.js";
import type { ChooseListProps } from "./ChooseList.js";
import { ChoosePanel } from "./ChoosePanel.js";
import type { ChoosePanelProps } from "./ChoosePanel.js";
import type { ChooseItem, ChooseResult, ChooseSource } from "./types.js";
import { useChoose } from "./use-choose.js";
import type { ChooseController } from "./use-choose.js";

interface ChooseOverlayBaseProps {
  items: ChooseSource;
  prompt?: string;
  placeholder?: string;
  emptyMessage?: string;
  onCancel: () => void;
  commands?: ActionDefinition[];
  controllerRef?: Ref<ChooseController>;
  renderItem?: ChooseListProps["renderItem"];
  hints?: ChoosePanelProps["hints"];
  statusRight?: ReactNode;
  footer?: ReactNode;
  inset?: ChoosePanelProps["inset"];
  /** Nested modal content rendered above the chooser panel. */
  children?: ReactNode;
  /** Explicit interaction guard for legacy child overlays without a command surface. */
  suspended?: boolean;
}

export type ChooseOverlayProps = ChooseOverlayBaseProps &
  (
    | {
        multi?: false;
        onSelect: (item: ChooseItem) => void | Promise<void>;
        onSubmit?: never;
      }
    | {
        multi: true;
        onSubmit: (result: ChooseResult) => void | Promise<void>;
        onSelect?: never;
      }
  );

/**
 * Composed picker surface. Hosts should mount it on an owned modal command
 * surface (as Tooee's overlay manager does) so nested surfaces suspend it.
 */
export const ChooseOverlay = function ChooseOverlay(props: ChooseOverlayProps) {
  const multi = props.multi === true;
  const choose = useChoose({
    commandScope: "choose-overlay",
    commands: props.commands,
    multi,
    onCancel: props.onCancel,
    onSubmit: (result) => {
      if (multi) return props.onSubmit(result);
      const [item] = result.items;
      if (item) return props.onSelect(item);
    },
    source: props.items,
    suspended: props.suspended,
  });

  useImperativeHandle(props.controllerRef, () => choose.controller, [choose.controller]);

  return (
    <>
      <ChoosePanel
        title={props.prompt}
        filter={
          <ChooseFilter choose={choose} placeholder={props.placeholder} onClose={props.onCancel} />
        }
        multi={multi}
        hints={props.hints}
        statusRight={props.statusRight}
        footer={props.footer}
        inset={props.inset}
      >
        <ChooseList
          choose={choose}
          rowClick="submit"
          renderItem={props.renderItem}
          emptyContent={props.emptyMessage}
          suspended={props.suspended}
        />
      </ChoosePanel>
      {props.children}
    </>
  );
};
