import type { ReactNode } from "react";
import { useMode } from "@tooee/commands";
import type { Mode } from "@tooee/commands";
import { CloseButton, useTheme } from "@tooee/themes";

export function buildChooseHints(
  mode: Mode,
  options: { multi?: boolean; extra?: string[] } = {},
): string[] {
  const base =
    mode === "insert"
      ? ["↑↓ navigate", "Enter confirm", ...(options.multi ? ["Tab toggle"] : []), "Esc commands"]
      : [
          "j/k navigate",
          "i insert",
          ...(options.multi ? ["Tab toggle"] : []),
          "Esc/q cancel",
          "Enter confirm",
        ];
  return options.extra ? [...base, ...options.extra] : base;
}

export type ChoosePanelInsetValue = number | "auto" | `${number}%`;

export interface ChoosePanelInset {
  left?: ChoosePanelInsetValue;
  right?: ChoosePanelInsetValue;
  top?: ChoosePanelInsetValue;
  bottom?: ChoosePanelInsetValue;
}

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
}

/** Bordered chooser chrome with filter, content, hint/status, and footer slots. */
export function ChoosePanel({
  title,
  filter,
  children,
  multi,
  hints,
  statusRight,
  footer,
  onClose,
  inset,
}: ChoosePanelProps) {
  const { theme } = useTheme();
  const mode = useMode();
  const defaults = buildChooseHints(mode, { multi });
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

      {filter}
      {children}

      {footer != null && (
        <box height={1} paddingLeft={1} paddingRight={1}>
          {footer}
        </box>
      )}

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
