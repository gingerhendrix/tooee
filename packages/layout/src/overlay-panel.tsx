import type { ReactNode } from "react";
import type { MouseEvent } from "@opentui/core";
import { CloseButton, useTheme } from "@tooee/themes";
import { decodeReactContent } from "./react-content.js";
import type { DecodedReactContent } from "./react-content.js";

export type PanelInsetValue = number | "auto" | `${number}%`;

export interface PanelInset {
  left?: PanelInsetValue;
  right?: PanelInsetValue;
  top?: PanelInsetValue;
  bottom?: PanelInsetValue;
}

export interface OverlayPanelProps {
  /** Title bar content. Primitive text uses the active accent color. */
  title?: ReactNode;
  /** Content between the title bar and main panel body. */
  prompt?: ReactNode;
  children: ReactNode;
  /** Extra row below the body and above the hint bar. */
  footer?: ReactNode;
  /** Left-aligned hint bar content. */
  hints?: ReactNode;
  /** Right-aligned status area in the hint bar. */
  statusRight?: ReactNode;
  /** Overlay geometry when absolutely positioned. Defaults to 20% on all sides. */
  inset?: PanelInset;
  /** Show a title-bar close button. */
  onClose?: () => void;
  /** Mouse handler for the whole panel. */
  onMouseDown?: (event: MouseEvent) => void;
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

const renderPrompt = function renderPrompt(
  prompt: DecodedReactContent,
  textColor: string,
): ReactNode {
  if (prompt.kind === "empty") {
    return null;
  }
  if (prompt.kind === "node") {
    return prompt.value;
  }
  return (
    <box paddingLeft={1} paddingRight={1}>
      <text fg={textColor}>
        <strong>{prompt.value}</strong>
      </text>
    </box>
  );
};

/** Shared bordered chrome for modal overlay panels. */
export const OverlayPanel = function OverlayPanel({
  title,
  prompt,
  children,
  footer,
  hints,
  statusRight,
  inset,
  onClose,
  onMouseDown,
}: OverlayPanelProps): ReactNode {
  const { theme } = useTheme();
  const decodedTitle = decodeReactContent(title);
  const decodedPrompt = decodeReactContent(prompt);
  const decodedFooter = decodeReactContent(footer);
  const decodedHints = decodeReactContent(hints);
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

      {renderPrompt(decodedPrompt, theme.text)}

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
