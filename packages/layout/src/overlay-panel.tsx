import type { BoxRenderable, MouseEvent } from "@opentui/core";
import { useTheme } from "@tooee/themes";
import { useRef } from "react";
import type { ReactNode } from "react";

import { CloseButton } from "./close-button.js";
import { resolvePanelInset, useContainerSize } from "./panel-inset.js";
import type { PanelInset } from "./panel-inset.js";
import { decodeReactContent } from "./react-content.js";
import type { DecodedReactContent } from "./react-content.js";

export type { PanelInset, PanelInsetValue } from "./panel-inset.js";

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
  color: string
): ReactNode {
  if (content.kind === "empty") {
    return null;
  }

  return content.kind === "string" ? <text content={content.value} fg={color} /> : content.value;
};

const renderPrompt = function renderPrompt(
  prompt: DecodedReactContent,
  textColor: string
): ReactNode {
  if (prompt.kind === "empty") {
    return null;
  }

  if (prompt.kind === "node") {
    return prompt.value;
  }

  return (
    <box paddingLeft={1} paddingRight={1} flexShrink={0}>
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
  const panelRef = useRef<BoxRenderable>(null);
  const edges = resolvePanelInset(inset, useContainerSize(panelRef));

  return (
    <box
      ref={panelRef}
      position="absolute"
      left={edges.left}
      right={edges.right}
      top={edges.top}
      bottom={edges.bottom}
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
