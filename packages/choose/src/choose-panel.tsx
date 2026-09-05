import type { ReactNode } from "react";
import type { MouseEvent } from "@opentui/core";
import { useMode } from "@tooee/commands";
import type { Mode } from "@tooee/commands";
import { OverlayPanel } from "@tooee/layout";
import type { PanelInset, PanelInsetValue } from "@tooee/layout";

export const buildChooseHints = function buildChooseHints(
  mode: Mode,
  options: { multi?: boolean; extra?: string[] } = {},
): string[] {
  const base =
    mode === "insert"
      ? [
          "↑↓ navigate",
          "Enter confirm",
          ...(options.multi === true ? ["Tab toggle"] : []),
          "Esc commands",
        ]
      : [
          "j/k navigate",
          "i insert",
          ...(options.multi === true ? ["Tab toggle"] : []),
          "Esc/q cancel",
          "Enter confirm",
        ];
  return options.extra ? [...base, ...options.extra] : base;
};

export type ChoosePanelInsetValue = PanelInsetValue;
export type ChoosePanelInset = PanelInset;

export interface ChoosePanelProps {
  title?: ReactNode;
  filter: ReactNode;
  children: ReactNode;
  multi?: boolean;
  hints?: (context: { mode: Mode; defaults: string[] }) => ReactNode;
  statusRight?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  inset?: ChoosePanelInset;
  onMouseDown?: (event: MouseEvent) => void;
}

/** Chooser-specific overlay panel with mode-aware default hints. */
export const ChoosePanel = function ChoosePanel({
  title,
  filter,
  children,
  multi,
  hints,
  statusRight,
  footer,
  onClose,
  inset,
  onMouseDown,
}: ChoosePanelProps): ReactNode {
  const mode = useMode();
  const defaults = buildChooseHints(mode, { multi });
  const hintContent = hints ? hints({ defaults, mode }) : defaults.join("  ");

  return (
    <OverlayPanel
      title={title}
      prompt={filter}
      hints={hintContent}
      statusRight={statusRight}
      footer={footer}
      onClose={onClose}
      inset={inset}
      onMouseDown={onMouseDown}
    >
      {children}
    </OverlayPanel>
  );
};
