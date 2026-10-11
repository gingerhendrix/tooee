/**
 * Display parts for chat turns: text, thinking, tool calls, and images.
 * Converts Pi message content into small plain objects the reducer and the
 * views use. Images decode their base64 data once, here, so the views can
 * draw the pixels with the OpenTUI `<image>` element.
 */

import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { imageInfo } from "@opentui/core";

type AgentMessage = Extract<AgentSessionEvent, { type: "message_end" }>["message"];

type PiAssistantMessage = Extract<AgentMessage, { role: "assistant" }>;

export type PiToolResultMessage = Extract<AgentMessage, { role: "toolResult" }>;

export type PiImageContent = Extract<PiToolResultMessage["content"][number], { type: "image" }>;

export type ToolCallStatus = "pending" | "running" | "done" | "error" | "cancelled";

export interface ImagePart {
  kind: "image";
  mimeType: string;
  /** Decoded size in bytes. */
  bytes: number;
  /** The decoded image file. The `<image>` element reads it as its source. */
  data: Uint8Array;
  /** Pixel size from the image header. Not set when OpenTUI cannot read the header. */
  size?: { width: number; height: number };
}

export interface ToolResultView {
  text: string;
  images: readonly ImagePart[];
  isError: boolean;
}

export type TurnPart =
  | { kind: "text"; text: string }
  | { kind: "thinking"; text: string; redacted: boolean }
  | {
      kind: "toolCall";
      id: string;
      name: string;
      /** Arguments as compact JSON. Partial while the call streams. */
      args: string;
      status: ToolCallStatus;
      result?: ToolResultView;
    }
  | ImagePart;

export type ToolCallPart = Extract<TurnPart, { kind: "toolCall" }>;

const pixelSize = function pixelSize(data: Uint8Array): ImagePart["size"] {
  try {
    const { width, height } = imageInfo(data);

    return { height, width };
  } catch {
    // Not a PNG, JPEG, WebP, or GIF that OpenTUI can read. The view shows the label only.
    return undefined;
  }
};

export const imagePart = function imagePart(image: PiImageContent): ImagePart {
  const data = new Uint8Array(Buffer.from(image.data, "base64"));

  return {
    bytes: data.length,
    data,
    kind: "image",
    mimeType: image.mimeType,
    size: pixelSize(data),
  };
};

const assistantPart = function assistantPart(
  part: PiAssistantMessage["content"][number]
): TurnPart | undefined {
  switch (part.type) {
    case "text": {
      return part.text === "" ? undefined : { kind: "text", text: part.text };
    }

    case "thinking": {
      // Some providers send only a signature, with no thinking text to show.
      const redacted = part.redacted === true;

      return part.thinking === "" && !redacted
        ? undefined
        : { kind: "thinking", redacted, text: part.thinking };
    }

    case "toolCall": {
      return {
        args: JSON.stringify(part.arguments ?? {}),
        id: part.id,
        kind: "toolCall",
        name: part.name,
        status: "pending",
      };
    }

    default: {
      return undefined;
    }
  }
};

/**
 * Display parts of an assistant message, in content order. Empty text parts
 * and empty thinking parts that are not redacted are skipped.
 */
export const assistantParts = function assistantParts(message: AgentMessage): TurnPart[] {
  if (!("role" in message) || message.role !== "assistant") {
    return [];
  }

  return message.content.flatMap((part) => assistantPart(part) ?? []);
};

/** Display parts of a prompt the user typed. Images join later as image parts. */
export const userParts = function userParts(text: string): TurnPart[] {
  return text === "" ? [] : [{ kind: "text", text }];
};

export const toolResultView = function toolResultView(
  message: PiToolResultMessage
): ToolResultView {
  const text = message.content.flatMap((part) => (part.type === "text" ? [part.text] : []));

  const images = message.content.flatMap((part) =>
    part.type === "image" ? [imagePart(part)] : []
  );

  return { images, isError: message.isError, text: text.join("\n") };
};

/**
 * Rebuilt parts start every tool call as "pending". Keep the status and the
 * result that tool events already set on the same call id.
 */
export const keepToolProgress = function keepToolProgress(
  previous: readonly TurnPart[],
  next: readonly TurnPart[]
): TurnPart[] {
  const known = new Map(
    previous.flatMap((part) => (part.kind === "toolCall" ? [[part.id, part] as const] : []))
  );

  return next.map((part) => {
    if (part.kind !== "toolCall") {
      return part;
    }

    const old = known.get(part.id);

    return old === undefined ? part : { ...part, result: old.result, status: old.status };
  });
};
