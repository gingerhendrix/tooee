import { describe, expect, test } from "bun:test";

import { fitStatusBar, StatusPriority } from "../src/fit-status-bar.js";
import type { StatusBarItem } from "../src/fit-status-bar.js";
import {
  chatItems,
  diffItems,
  documentItems,
  renderPlain,
  visibleKeys,
} from "./status-bar-fixtures.js";

const cells = (text: string): number => Bun.stringWidth(text);

const sets = { chatItems, diffItems, documentItems };

describe("fitStatusBar at every width", () => {
  for (const [name, items] of Object.entries(sets)) {
    test(`${name}: never wider than the bar from 10 to 220 cells`, () => {
      for (let width = 10; width <= 220; width += 1) {
        expect(cells(renderPlain(fitStatusBar(items, width), width))).toBeLessThanOrEqual(width);
      }
    });

    test(`${name}: the visible item count never grows as the width shrinks`, () => {
      let previous = Number.POSITIVE_INFINITY;

      for (let width = 220; width >= 10; width -= 1) {
        const count = visibleKeys(fitStatusBar(items, width)).length;
        expect(count).toBeLessThanOrEqual(previous);
        previous = count;
      }
    });

    test(`${name}: the last item never hides`, () => {
      for (let width = 0; width <= 220; width += 1) {
        expect(visibleKeys(fitStatusBar(items, width)).length).toBeGreaterThanOrEqual(1);
      }
    });
  }

  test("a label never touches its value", () => {
    for (let width = 10; width <= 220; width += 1) {
      expect(renderPlain(fitStatusBar(documentItems, width), width)).not.toMatch(/:[^\s]/u);
    }
  });
});

describe("fitStatusBar rules", () => {
  test("plain { label, value } items render as before when they fit", () => {
    const items: StatusBarItem[] = [
      { label: "Mode", value: "cursor" },
      { label: "Theme", value: "dracula" },
    ];

    const layout = fitStatusBar(items, 58);

    expect(renderPlain(layout, 58)).toBe("Mode cursor  Theme dracula");
    expect(layout.hidden).toBe(0);
    expect(layout.marker).toBeNull();
  });

  test("the lowest priority item hides first", () => {
    const keys = visibleKeys(fitStatusBar(chatItems, 70));

    expect(keys).not.toContain("keys");
    expect(keys).toContain("model");
  });

  test("on a priority tie, the item further right hides first", () => {
    const items: StatusBarItem[] = [
      { id: "a", label: "A:", value: "one" },
      { id: "b", label: "B:", value: "two" },
      { id: "c", label: "C:", value: "three" },
    ];

    expect(visibleKeys(fitStatusBar(items, 18))).toEqual(["a", "b"]);
  });

  test("compact forms come before any item shortens or hides", () => {
    const line = renderPlain(fitStatusBar(chatItems, 98), 98);

    expect(line).toContain(": palette");
    expect(line).toContain("openrouter/google/gemini-3.6-flash");
  });

  test("give-back restores full forms where there is room", () => {
    const layout = fitStatusBar(documentItems, 68);
    const cursor = layout.end.find((item) => item.key === "cursor");

    expect(cursor?.label).toBe("Cursor:");
  });

  test("a truncatable value shortens before the item hides", () => {
    const layout = fitStatusBar(documentItems, 48);
    const search = layout.start.find((item) => item.key === "search");

    expect(search?.value.endsWith("…")).toBe(true);
  });

  test("the highest priority item survives at a tiny width", () => {
    expect(visibleKeys(fitStatusBar(chatItems, 12))).toEqual(["phase"]);
  });

  test("end items sit in the end group", () => {
    const layout = fitStatusBar(documentItems, 200);

    expect(layout.end.map((item) => item.key)).toEqual(["mode", "cursor"]);
  });
});

describe("hidden-item marker", () => {
  test("shows the default glyph when items hide", () => {
    const layout = fitStatusBar(documentItems, 58);

    expect(layout.hidden).toBeGreaterThan(0);
    expect(layout.marker).toBe("⋯");
    expect(renderPlain(layout, 58)).toContain("⋯");
  });

  test("takes cells, so the bar stays inside the width", () => {
    for (let width = 10; width <= 120; width += 1) {
      const layout = fitStatusBar(documentItems, width);
      expect(cells(renderPlain(layout, width))).toBeLessThanOrEqual(width);
    }
  });

  test("a custom glyph replaces the default", () => {
    expect(fitStatusBar(documentItems, 58, { hiddenMarker: "»" }).marker).toBe("»");
  });

  test("false turns the marker off", () => {
    const layout = fitStatusBar(documentItems, 58, { hiddenMarker: false });

    expect(layout.hidden).toBeGreaterThan(0);
    expect(layout.marker).toBeNull();
  });

  test("drops before the last item loses its label", () => {
    const items: StatusBarItem[] = [
      { id: "a", label: "Alpha:", priority: StatusPriority.critical, value: "x" },
      { id: "b", label: "Beta:", value: "y" },
    ];

    const layout = fitStatusBar(items, 8);

    expect(visibleKeys(layout)).toEqual(["a"]);
    expect(layout.marker).toBeNull();
    expect(layout.hidden).toBe(1);
  });
});
