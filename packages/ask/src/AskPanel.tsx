import type { ReactNode } from "react";
import type { MouseEvent } from "@opentui/core";
import { useTheme, CloseButton } from "@tooee/themes";
import { useMode } from "@tooee/commands";
import type { Mode } from "@tooee/commands";

/**
 * Default hint-bar entries for the current mode. Composites append their own
 * entries via `extra` rather than re-writing the whole string.
 */
export function buildAskHints(
  mode: Mode,
  opts: { multiline?: boolean; extra?: string[] } = {},
): string[] {
  const submitHint = opts.multiline === true ? "Shift+Enter submit" : "Enter submit";
  const base =
    mode === "insert" ? [submitHint, "Esc commands"] : ["i insert", "q quit", submitHint];
  return opts.extra ? [...base, ...opts.extra] : base;
}

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

/**
 * Shared bordered panel chrome for ask surfaces: title bar, optional prompt
 * line, editor area, optional footer, and a hint bar with slots.
 */
export function AskPanel({
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
}: AskPanelProps) {
  const { theme } = useTheme();
  const mode = useMode();

  const defaults = buildAskHints(mode, { multiline });
  const hintContent = hints ? hints({ mode, defaults }) : defaults.join("  ");

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
      {title != null && (
        <box
          flexDirection="row"
          height={1}
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={theme.backgroundElement}
        >
          {typeof title === "string" ? (
            <text content={title} fg={theme.accent} style={{ flexGrow: 1 }} />
          ) : (
            <box flexDirection="row" style={{ flexGrow: 1 }}>
              {title}
            </box>
          )}
          {onClose && <CloseButton onClose={onClose} />}
        </box>
      )}

      {prompt != null && (
        <box paddingLeft={1} paddingRight={1}>
          {typeof prompt === "string" ? (
            <text fg={theme.text}>
              <strong>{prompt}</strong>
            </text>
          ) : (
            prompt
          )}
        </box>
      )}

      {/* Editor area */}
      <box flexDirection="column" style={{ flexGrow: 1, paddingLeft: 1, paddingRight: 1 }}>
        {children}
      </box>

      {footer != null && (
        <box paddingLeft={1} paddingRight={1}>
          {footer}
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
          {typeof hintContent === "string" ? (
            <text content={hintContent} fg={theme.textMuted} />
          ) : (
            hintContent
          )}
        </box>
        {statusRight != null &&
          (typeof statusRight === "string" ? (
            <text content={statusRight} fg={theme.textMuted} />
          ) : (
            statusRight
          ))}
      </box>
    </box>
  );
}
