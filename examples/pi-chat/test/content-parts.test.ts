import { describe, expect, test } from "bun:test";

import { assistantParts, imagePart, keepToolProgress, userParts } from "../content-parts.js";
import type { TurnPart } from "../content-parts.js";
import { mixed, PNG_BASE64 } from "./fixtures.js";

describe("content parts", () => {
  test("assistant content maps to thinking, text, and tool call parts in order", () => {
    expect(assistantParts(mixed)).toEqual([
      { kind: "thinking", redacted: false, text: "Look at the file" },
      { kind: "thinking", redacted: true, text: "" },
      { kind: "text", text: "Reading it." },
      { args: '{"path":"a.png"}', id: "call-1", kind: "toolCall", name: "read", status: "pending" },
    ]);
  });

  test("user text becomes one text part, and images decode to bytes and a pixel size", () => {
    expect(userParts("hi")).toEqual([{ kind: "text", text: "hi" }]);
    expect(userParts("")).toEqual([]);

    const image = imagePart({ data: PNG_BASE64, mimeType: "image/png", type: "image" });

    expect(image).toMatchObject({
      bytes: 70,
      kind: "image",
      mimeType: "image/png",
      size: { height: 1, width: 1 },
    });
    expect(image.data).toBeInstanceOf(Uint8Array);
    expect(image.data).toHaveLength(70);
  });

  test("an image that OpenTUI cannot read has no pixel size", () => {
    const image = imagePart({ data: "bm9wZQ==", mimeType: "image/png", type: "image" });

    expect(image.bytes).toBe(4);
    expect(image.size).toBeUndefined();
  });

  test("keepToolProgress leaves calls with a new id as pending", () => {
    const running: TurnPart = {
      args: "{}",
      id: "a",
      kind: "toolCall",
      name: "ls",
      status: "running",
    };

    const fresh: TurnPart = { ...running, id: "b", status: "pending" };

    expect(keepToolProgress([running], [{ ...running, status: "pending" }, fresh])).toEqual([
      running,
      fresh,
    ]);
  });
});
