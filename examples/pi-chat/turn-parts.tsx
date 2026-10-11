/**
 * Views for the parts of a chat turn: thinking, tool calls with their
 * results, and image placeholders. Text parts render in message-item.tsx.
 * By default thinking and tool output show a short preview; the details
 * toggle (ctrl+e) shows all of it.
 */

import { useTheme } from "@tooee/themes";
import type { ReactNode } from "react";

import type { ImagePart, ToolCallPart, ToolCallStatus, TurnPart } from "./content-parts.js";
import { argsSummary, imageLabel, previewLines, TOOL_STATUS_LABEL } from "./part-format.js";
import type { Preview } from "./part-format.js";
import { DETAILS_HOTKEY } from "./use-chat-commands.js";

const THINKING_PREVIEW_LINES = 3;

const RESULT_PREVIEW_LINES = 4;

type StatusColor = "error" | "success" | "textMuted" | "warning";

const STATUS_COLOR: Record<ToolCallStatus, StatusColor> = {
  cancelled: "textMuted",
  done: "success",
  error: "error",
  pending: "textMuted",
  running: "warning",
};

const HiddenLines = function HiddenLines({ preview }: { preview: Preview }): ReactNode {
  const { theme } = useTheme();

  if (preview.hidden === 0) {
    return null;
  }

  return (
    <text
      content={`… ${preview.hidden} more lines (${DETAILS_HOTKEY} shows all)`}
      fg={theme.textMuted}
    />
  );
};

export const ImageChip = function ImageChip({ image }: { image: ImagePart }): ReactNode {
  const { theme } = useTheme();

  return <text content={imageLabel(image)} fg={theme.info} />;
};

export const ThinkingBlock = function ThinkingBlock({
  part,
  streaming,
  showDetails,
}: {
  part: Extract<TurnPart, { kind: "thinking" }>;
  streaming: boolean;
  showDetails: boolean;
}): ReactNode {
  const { theme } = useTheme();

  // While thinking streams, follow its newest lines.
  const preview = showDetails
    ? { hidden: 0, text: part.text.trimEnd() }
    : previewLines(part.text, THINKING_PREVIEW_LINES, streaming ? "end" : "start");

  return (
    <box
      border={["left"]}
      borderColor={theme.borderSubtle}
      borderStyle="single"
      flexDirection="column"
      paddingLeft={1}
    >
      <text fg={theme.textMuted}>
        <em>{part.redacted ? "Thinking (redacted)" : "Thinking"}</em>
      </text>
      {preview.text === "" ? null : <text content={preview.text} fg={theme.textMuted} />}
      <HiddenLines preview={preview} />
    </box>
  );
};

const ToolResult = function ToolResult({
  part,
  showDetails,
}: {
  part: ToolCallPart;
  showDetails: boolean;
}): ReactNode {
  const { theme } = useTheme();
  const { result } = part;

  if (result === undefined) {
    return null;
  }

  const preview = showDetails
    ? { hidden: 0, text: result.text.trimEnd() }
    : previewLines(result.text, RESULT_PREVIEW_LINES);

  return (
    <box flexDirection="column">
      {preview.text === "" ? null : (
        <text content={preview.text} fg={result.isError ? theme.error : theme.textMuted} />
      )}
      <HiddenLines preview={preview} />
      {result.images.map((image, index): ReactNode => (
        <ImageChip key={index} image={image} />
      ))}
    </box>
  );
};

export const ToolCallBlock = function ToolCallBlock({
  part,
  showDetails,
}: {
  part: ToolCallPart;
  showDetails: boolean;
}): ReactNode {
  const { theme } = useTheme();
  const args = argsSummary(part.args);

  return (
    <box
      border={["left"]}
      borderColor={theme.borderSubtle}
      borderStyle="single"
      flexDirection="column"
      paddingLeft={1}
    >
      <text>
        <strong fg={theme.secondary}>{part.name}</strong>
        <span fg={theme.text}>{args === "" ? "" : ` ${args}`}</span>
        <span fg={theme[STATUS_COLOR[part.status]]}>{` · ${TOOL_STATUS_LABEL[part.status]}`}</span>
      </text>
      <ToolResult part={part} showDetails={showDetails} />
    </box>
  );
};
