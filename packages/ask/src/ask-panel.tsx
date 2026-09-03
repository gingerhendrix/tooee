import type { ReactNode } from "react";
import type { MouseEvent } from "@opentui/core";
import { useTheme, CloseButton } from "@tooee/themes";
import { useMode } from "@tooee/commands";
import type { Mode } from "@tooee/commands";

/**
 * Default hint-bar entries for the current mode. Composites append their own
 * entries via `extra` rather than re-writing the whole string.
 */
export const buildAskHints = function buildAskHints(
  mode: Mode,
  opts: { multiline?: boolean; extra?: string[] } = {},
): string[] {
  const submitHint =
    opts.multiline === true && mode === "insert" ? "Shift+Enter submit" : "Enter submit";
  const base =
    mode === "insert" ? [submitHint, "Esc commands"] : ["i insert", "q quit", submitHint];
  return opts.extra ? [...base, ...opts.extra] : base;
};

export type AskPanelInsetValue = number | "auto" | `${number}%`;

export interface AskPanelInset {
  left?: AskPanelInsetValue;
  right?: AskPanelInsetValue;
  top?: AskPanelInsetValue;
  bottom?: AskPanelInsetValue;
}

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

interface EmptyPanelContent {
  kind: "empty";
}

interface StringPanelContent {
  kind: "string";
  value: string;
}

interface NodePanelContent {
  kind: "node";
  value: ReactNode;
}

type PanelContent = EmptyPanelContent | StringPanelContent | NodePanelContent;

/** Decode a public React slot once into the panel's three rendering cases. */
const decodePanelContent = function decodePanelContent(content: ReactNode): PanelContent {
  if (content === null || content === undefined) {
    return { kind: "empty" };
  }
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- ReactNode boundary distinguishes themed primitive text from nodes rendered by React
  if (typeof content === "string") {
    return { kind: "string", value: content };
  }
  return { kind: "node", value: content };
};

const renderStatus = function renderStatus(status: PanelContent, textMuted: string): ReactNode {
  if (status.kind === "empty") {
    return null;
  }
  return status.kind === "string" ? <text content={status.value} fg={textMuted} /> : status.value;
};

const renderHints = function renderHints(hints: PanelContent, textMuted: string): ReactNode {
  if (hints.kind === "empty") {
    return null;
  }
  return hints.kind === "string" ? <text content={hints.value} fg={textMuted} /> : hints.value;
};

/**
 * Shared bordered panel chrome for ask surfaces: title bar, optional prompt
 * line, editor area, optional footer, and a hint bar with slots.
 */
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
  const { theme } = useTheme();
  const mode = useMode();

  const defaults = buildAskHints(mode, { multiline });
  const hintContent = hints ? hints({ defaults, mode }) : defaults.join("  ");
  const decodedTitle = decodePanelContent(title);
  const decodedPrompt = decodePanelContent(prompt);
  const decodedFooter = decodePanelContent(footer);
  const decodedHints = decodePanelContent(hintContent);
  const decodedStatus = decodePanelContent(statusRight);

  return (
    <box
      position="absolute"
      left={inset?.left ?? "20%"}
      right={inset?.right ?? "20%"}
      top={inset?.top ?? "20%"}
      bottom={inset?.bottom ?? "20%"}
      flexDirection="column"
      backgroundColor={theme.backgroundPanel}
      border
      borderColor={theme.borderActive}
      onMouseDown={onMouseDown}
    >
      {decodedTitle.kind !== "empty" && (
        <box
          flexDirection="row"
          height={1}
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={theme.backgroundElement}
        >
          {decodedTitle.kind === "string" ? (
            <text content={decodedTitle.value} fg={theme.accent} style={{ flexGrow: 1 }} />
          ) : (
            <box flexDirection="row" style={{ flexGrow: 1 }}>
              {decodedTitle.value}
            </box>
          )}
          {onClose && <CloseButton onClose={onClose} />}
        </box>
      )}

      {decodedPrompt.kind !== "empty" && (
        <box paddingLeft={1} paddingRight={1}>
          {decodedPrompt.kind === "string" ? (
            <text fg={theme.text}>
              <strong>{decodedPrompt.value}</strong>
            </text>
          ) : (
            decodedPrompt.value
          )}
        </box>
      )}

      {/* Editor area */}
      <box flexDirection="column" style={{ flexGrow: 1, paddingLeft: 1, paddingRight: 1 }}>
        {children}
      </box>

      {decodedFooter.kind !== "empty" && (
        <box paddingLeft={1} paddingRight={1}>
          {decodedFooter.value}
        </box>
      )}

      {/* Hint line */}
      <box
        flexDirection="row"
        height={1}
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={theme.backgroundElement}
      >
        <box flexDirection="row" style={{ flexGrow: 1 }}>
          {renderHints(decodedHints, theme.textMuted)}
        </box>
        {renderStatus(decodedStatus, theme.textMuted)}
      </box>
    </box>
  );
};
