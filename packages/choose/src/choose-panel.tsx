import type { ReactNode } from "react";
import { useMode } from "@tooee/commands";
import type { Mode } from "@tooee/commands";
import { CloseButton, useTheme } from "@tooee/themes";
import { decodeReactContent } from "./react-content.js";
import type { DecodedReactContent } from "./react-content.js";

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

const renderThemedContent = function renderThemedContent(
  content: DecodedReactContent,
  color: string,
): ReactNode {
  if (content.kind === "empty") {
    return null;
  }
  return content.kind === "string" ? <text content={content.value} fg={color} /> : content.value;
};

/** Bordered chooser chrome with filter, content, hint/status, and footer slots. */
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
}: ChoosePanelProps): ReactNode {
  const { theme } = useTheme();
  const mode = useMode();
  const defaults = buildChooseHints(mode, { multi });
  const hintContent = hints ? hints({ defaults, mode }) : defaults.join("  ");
  const decodedTitle = decodeReactContent(title);
  const decodedFooter = decodeReactContent(footer);
  const decodedHints = decodeReactContent(hintContent);
  const decodedStatus = decodeReactContent(statusRight);

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

      {filter}
      {children}

      {decodedFooter.kind !== "empty" && (
        <box height={1} paddingLeft={1} paddingRight={1}>
          {decodedFooter.value}
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
          {renderThemedContent(decodedHints, theme.textMuted)}
        </box>
        {renderThemedContent(decodedStatus, theme.textMuted)}
      </box>
    </box>
  );
};
