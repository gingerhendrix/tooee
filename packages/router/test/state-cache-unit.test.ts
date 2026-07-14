import { test, expect, describe } from "bun:test";
import { StateCache, createStateKey } from "@tooee/router";
import type { Codec } from "@tooee/router";

const scrollState: Codec<{ scrollY: number }> = {
  parse: (value) => {
    if (typeof value !== "object" || value === null || !("scrollY" in value)) {
      throw new TypeError("Expected { scrollY }");
    }
    const { scrollY } = value;
    if (typeof scrollY !== "number") {
      throw new TypeError("Expected scrollY to be a number");
    }
    return { scrollY };
  },
};

const homeKey = createStateKey("0:home", scrollState);
const detailKey = createStateKey("1:detail", scrollState);
const missingKey = createStateKey("0:unknown", scrollState);

describe("StateCache", () => {
  test("save and restore returns the same value, decoded by the key's codec", () => {
    const cache = new StateCache();
    cache.save(homeKey, { scrollY: 42 });
    expect(cache.restore(homeKey)).toEqual({ scrollY: 42 });
  });

  test("restore unknown key returns undefined", () => {
    const cache = new StateCache();
    expect(cache.restore(missingKey)).toBeUndefined();
  });

  test("clear removes entry", () => {
    const cache = new StateCache();
    cache.save(homeKey, { scrollY: 1 });
    cache.clear(homeKey);
    expect(cache.restore(homeKey)).toBeUndefined();
  });

  test("overwrite replaces value", () => {
    const cache = new StateCache();
    cache.save(homeKey, { scrollY: 1 });
    cache.save(homeKey, { scrollY: 2 });
    expect(cache.restore(homeKey)).toEqual({ scrollY: 2 });
  });

  test("clearAll removes all entries", () => {
    const cache = new StateCache();
    cache.save(homeKey, { scrollY: 1 });
    cache.save(detailKey, { scrollY: 2 });
    cache.clearAll();
    expect(cache.restore(homeKey)).toBeUndefined();
    expect(cache.restore(detailKey)).toBeUndefined();
  });

  test("restore decodes rather than asserting: a mismatched value is rejected", () => {
    const cache = new StateCache();
    // Simulate a value written by an older build / different shape.
    cache.save(createStateKey("0:home", { parse: (value) => value }), { scrollY: "nope" });
    expect(() => cache.restore(homeKey)).toThrow(TypeError);
  });
});
