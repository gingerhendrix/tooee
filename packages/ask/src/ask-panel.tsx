import type { ReactNode } from "react";
import type { MouseEvent } from "@opentui/core";
import { useMode } from "@tooee/commands";
import type { Mode } from "@tooee/commands";
import { OverlayPanel } from "@tooee/layout";
import type { PanelInset, PanelInsetValue } from "@tooee/layout";

/**
 * Default hint-bar entries for the current mode. Composites append their own
 * entries via `extra` rather than re-writing the whole string.
 */
export const buildAskHints = function buildAskHints(
  mode: Mode,
  opts: { multiline?: boolean; cursorExtra?: string[]; extra?: string[] } = {},
): string[] {
  const submitHint =
    opts.multiline === true && mode === "insert" ? "Shift+Enter submit" : "Enter submit";
  const base =
    mode === "insert"
      ? [submitHint, "Esc commands"]
      : ["i insert", "q quit", ...(opts.cursorExtra ?? []), submitHint];
  return opts.extra ? [...base, ...opts.extra] : base;
};

export type AskPanelInsetValue = PanelInsetValue;
export type AskPanelInset = PanelInset;

export interface AskPanelProps {
  /** Title bar content (string renders themed; CloseButton shown with onClose). */
  title?: ReactNode;
  /** Prompt line above the editor area. */
  prompt?: ReactNode;
  /** Editor area. */
  children: ReactNode;
  /** Used for the default submit hint ("Enter" vs "Shift+Enter"). */
  multiline?: boolean;
  /** Hint bar. Default renders the standard hints for the current mode. */
  hints?: (ctx: { mode: Mode; defaults: string[] }) => ReactNode;
  /** Right-aligned status area in the hint bar (e.g. a dictation indicator). */
  statusRight?: ReactNode;
  /** Extra row below the editor, above the hint bar. */
  footer?: ReactNode;
  /** Shows the title-bar CloseButton. */
  onClose?: () => void;
  /** Overlay geometry when absolutely positioned (default 20% on all sides). */
  inset?: AskPanelInset;
  /** Mouse handler for the whole panel (e.g. middle-click paste). */
  onMouseDown?: (event: MouseEvent) => void;
}

/** Ask-specific overlay panel with mode-aware default hints. */
export const AskPanel = function AskPanel({
  title,
  prompt,
  children,
  multiline,
  hints,
  statusRight,
  footer,
  onClose,
  inset,
  onMouseDown,
}: AskPanelProps): ReactNode {
  const mode = useMode();
  const defaults = buildAskHints(mode, { multiline });
  const hintContent = hints ? hints({ defaults, mode }) : defaults.join("  ");

  return (
    <OverlayPanel
      title={title}
      prompt={prompt}
      hints={hintContent}
      statusRight={statusRight}
      footer={footer}
      onClose={onClose}
      inset={inset}
      onMouseDown={onMouseDown}
    >
      <box flexDirection="column" style={{ flexGrow: 1, paddingLeft: 1, paddingRight: 1 }}>
        {children}
      </box>
    </OverlayPanel>
  );
};
