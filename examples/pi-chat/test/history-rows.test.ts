import { describe, expect, test } from "bun:test";

import type { ChatTurn } from "../chat-state.js";
import { hasDetails, historyRowAdapter, historyRows, turnText } from "../history-rows.js";

const user: ChatTurn = {
  aborted: false,
  id: 1,
  parts: [{ kind: "text", text: "list the files" }],
  role: "user",
  streaming: false,
};

const reply: ChatTurn = {
  aborted: false,
  id: 2,
  model: "openrouter/flash",
  parts: [
    { kind: "thinking", redacted: false, text: "Use ls." },
    {
      args: '{"path":"."}',
      id: "call-1",
      kind: "toolCall",
      name: "ls",
      result: { images: [], isError: false, text: "a.ts\nb.ts" },
      status: "done",
    },
    { kind: "text", text: "Two files." },
    { kind: "text", text: "  a.ts and b.ts  " },
  ],
  role: "assistant",
  streaming: true,
};

describe("historyRows", () => {
  test("gives each turn a header row, then one row for each part", () => {
    const rows = historyRows([user, reply]);

    expect(rows.map((row) => `${row.kind}:${row.key}`)).toEqual([
      "header:1",
      "part:1.0",
      "header:2",
      "part:2.0",
      "part:2.1",
      "part:2.2",
      "part:2.3",
    ]);
    expect(rows.map((row) => row.endsTurn)).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  test("a turn with no parts ends at its header", () => {
    const [header] = historyRows([{ ...reply, parts: [] }]);

    expect(header?.endsTurn).toBe(true);
  });

  test("marks only the newest part of a streaming turn as live", () => {
    const live = historyRows([user, reply]).map((row) => row.kind === "part" && row.live);

    expect(live).toEqual([false, false, false, false, false, false, true]);
  });
});

describe("historyRowAdapter", () => {
  test("gives search and copy text for headers and each part kind", () => {
    const rows = historyRows([user, reply]);
    const text = rows.map((row, index) => historyRowAdapter.getText(row, index));

    expect(text).toEqual([
      "You",
      "list the files",
      "openrouter/flash …",
      "Thinking\nUse ls.",
      'ls {"path":"."} · done\na.ts\nb.ts',
      "Two files.",
      "  a.ts and b.ts  ",
    ]);
  });
});

describe("turnText", () => {
  test("joins the trimmed text parts and skips thinking and tools", () => {
    expect(turnText(reply)).toBe("Two files.\n\na.ts and b.ts");
  });
});

describe("hasDetails", () => {
  test("is true for thinking and tool rows only", () => {
    const rows = historyRows([user, reply]);

    expect(rows.map(hasDetails)).toEqual([false, false, false, true, true, false, false]);
  });
});
