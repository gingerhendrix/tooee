import { describe, expect, test } from "bun:test";

import { fitStatusBar } from "@tooee/layout";
import type { StatusBarLayout } from "@tooee/layout";

import { initialChatState } from "../chat-state.js";
import type { ChatState } from "../chat-state.js";
import { statusItems } from "../status-items.js";

const streaming: ChatState = {
  ...initialChatState,
  modelLabel: "openrouter/google/gemini-3.6-flash",
  phase: "streaming",
  thinkingLevel: "medium",
};

const fit = (state: ChatState, width: number): StatusBarLayout =>
  fitStatusBar(statusItems(state), width);

const startText = (layout: StatusBarLayout): string[] =>
  layout.start.map((item) => `${item.label} ${item.value}`.trim());

describe("statusItems", () => {
  test("shows model, thinking, and phase in full on a wide bar", () => {
    const layout = fit(streaming, 120);

    expect(startText(layout)).toEqual([
      "Model: openrouter/google/gemini-3.6-flash",
      "Thinking: medium",
    ]);
    expect(layout.end).toEqual([{ key: "phase", label: "Pi:", value: "streaming" }]);
    expect(layout.hidden).toBe(0);
  });

  test("hides thinking before it shortens the model", () => {
    const layout = fit(streaming, 60);

    expect(startText(layout)).toEqual(["Model: openrouter/google/gemini-3.6-flash"]);
    expect(layout.hidden).toBe(1);
    expect(layout.marker).toBe("⋯");
  });

  test("drops the model label and shortens the id in the middle on a narrow bar", () => {
    const [model] = fit(streaming, 40).start;

    expect(model?.label).toBe("");
    expect(model?.value).toBe("openrouter/…-3.6-flash");
  });

  test("keeps the session phase at the right edge at every width", () => {
    for (let width = 10; width <= 160; width += 1) {
      expect(fit(streaming, width).end.map((item) => item.key)).toEqual(["phase"]);
    }
  });

  test("shows placeholders before the session boots", () => {
    const layout = fit(initialChatState, 120);

    expect(startText(layout)).toEqual(["Model: none", "Thinking: off"]);
    expect(layout.end[0]?.value).toBe("starting");
  });
});
