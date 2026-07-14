import { test, expect, describe } from "bun:test";
import { stackReducer } from "@tooee/router";
import type { RouterState } from "@tooee/router";

const makeState = function makeState(...routeIds: string[]): RouterState {
  return {
    stack: routeIds.map((routeId) => ({ params: {}, routeId })),
  };
};

describe("stackReducer", () => {
  test("push adds entry to stack", () => {
    const state = makeState("home");
    const next = stackReducer(state, { routeId: "detail", type: "push" });
    expect(next.stack).toHaveLength(2);
    expect(next.stack[1].routeId).toBe("detail");
  });

  test("push preserves params", () => {
    const state = makeState("home");
    const next = stackReducer(state, {
      params: { id: "123" },
      routeId: "detail",
      type: "push",
    });
    expect(next.stack[1].params).toEqual({ id: "123" });
  });

  test("push defaults params to empty object", () => {
    const state = makeState("home");
    const next = stackReducer(state, { routeId: "detail", type: "push" });
    expect(next.stack[1].params).toEqual({});
  });

  test("pop removes last entry", () => {
    const state = makeState("home", "detail");
    const next = stackReducer(state, { type: "pop" });
    expect(next.stack).toHaveLength(1);
    expect(next.stack[0].routeId).toBe("home");
  });

  test("pop is no-op at stack bottom", () => {
    const state = makeState("home");
    const next = stackReducer(state, { type: "pop" });
    expect(next).toBe(state);
    expect(next.stack).toHaveLength(1);
  });

  test("replace swaps last entry", () => {
    const state = makeState("home", "detail");
    const next = stackReducer(state, {
      params: { tab: "general" },
      routeId: "settings",
      type: "replace",
    });
    expect(next.stack).toHaveLength(2);
    expect(next.stack[0].routeId).toBe("home");
    expect(next.stack[1].routeId).toBe("settings");
    expect(next.stack[1].params).toEqual({ tab: "general" });
  });

  test("reset clears stack to single entry", () => {
    const state = makeState("home", "detail", "nested");
    const next = stackReducer(state, { routeId: "home", type: "reset" });
    expect(next.stack).toHaveLength(1);
    expect(next.stack[0].routeId).toBe("home");
  });

  test("reset preserves params", () => {
    const state = makeState("home", "detail");
    const next = stackReducer(state, {
      params: { fresh: true },
      routeId: "settings",
      type: "reset",
    });
    expect(next.stack).toHaveLength(1);
    expect(next.stack[0].params).toEqual({ fresh: true });
  });

  test("push then pop returns to original", () => {
    const state = makeState("home");
    const pushed = stackReducer(state, { routeId: "detail", type: "push" });
    const popped = stackReducer(pushed, { type: "pop" });
    expect(popped.stack).toHaveLength(1);
    expect(popped.stack[0].routeId).toBe("home");
  });
});
