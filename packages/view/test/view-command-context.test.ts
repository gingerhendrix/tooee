import { describe, expect, test } from "bun:test";
import { createViewCommandContext } from "../src/hooks/use-view-command-context.js";
import { MarkSet } from "@tooee/marks";

const providerMark = new MarkSet("provider", 1, []);
const userMark = new MarkSet("user", 1, []);

describe("createViewCommandContext", () => {
  test("creates a safe headless custom content context", () => {
    const ctx = createViewCommandContext({});

    expect(ctx.content).toEqual({ data: undefined, format: "custom", title: undefined });
    expect(ctx.format).toBe("custom");
    expect(ctx.title).toBeUndefined();
    expect(ctx.data).toBeUndefined();

    expect(() => {
      ctx.reload();
    }).not.toThrow();
    expect(() => {
      ctx.marks.setMarkSet(userMark);
    }).not.toThrow();
    expect(() => {
      ctx.marks.clearNamespace("user");
    }).not.toThrow();
    expect(() => {
      ctx.marks.clearAll();
    }).not.toThrow();
    expect(ctx.marks.userMarks).toEqual([]);
    expect(ctx.marks.providerMarks).toEqual([]);
  });

  test("maps content, title/data and marks", () => {
    const reload = () => {};
    const setMarkSet = () => {};
    const clearNamespace = () => {};
    const clearAll = () => {};

    const ctx = createViewCommandContext({
      data: { rowCount: 10 },
      format: "dashboard",
      marks: {
        clearAll,
        clearNamespace,
        providerMarks: [providerMark],
        setMarkSet,
        userMarks: [userMark],
      },
      reload,
      title: "Dashboard",
    });

    expect(ctx.content).toEqual({
      data: { rowCount: 10 },
      format: "dashboard",
      title: "Dashboard",
    });
    expect(ctx.format).toBe("dashboard");
    expect(ctx.title).toBe("Dashboard");
    expect(ctx.data).toEqual({ rowCount: 10 });
    expect(ctx.reload).toBe(reload);
    expect(ctx.marks.setMarkSet).toBe(setMarkSet);
    expect(ctx.marks.clearNamespace).toBe(clearNamespace);
    expect(ctx.marks.clearAll).toBe(clearAll);
    expect(ctx.marks.userMarks).toEqual([userMark]);
    expect(ctx.marks.providerMarks).toEqual([providerMark]);
  });

  test("carries no row state — that belongs to ctx.document", () => {
    const ctx = createViewCommandContext({ content: { format: "text", text: "a\nb" } });

    expect(ctx).not.toHaveProperty("cursor");
    expect(ctx).not.toHaveProperty("selection");
    expect(ctx).not.toHaveProperty("toggledIndices");
    expect(ctx).not.toHaveProperty("activeRow");
    expect(ctx).not.toHaveProperty("selectedRows");
    expect(ctx).not.toHaveProperty("mode");
  });

  test("derives format and data from the supplied content", () => {
    const ctx = createViewCommandContext({
      content: { data: { columns: [] }, format: "kanban", title: "Board" },
    });

    expect(ctx.format).toBe("kanban");
    expect(ctx.title).toBe("Board");
    expect(ctx.data).toEqual({ columns: [] });
  });
});
