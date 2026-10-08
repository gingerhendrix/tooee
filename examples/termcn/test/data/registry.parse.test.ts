import { describe, expect, test } from "bun:test";

import { installCommand, parseRegistry, shortRegistryDependency } from "../../data/registry.js";
import { FIXTURE_REGISTRY } from "../support/fake-termcn.js";

describe("parseRegistry", () => {
  test("keeps only OpenTUI UI items, in category order", () => {
    const entries = parseRegistry(FIXTURE_REGISTRY);

    expect(entries.map((entry) => entry.name)).toEqual(["box", "key-echo"]);
    expect(entries[0]).toEqual({
      category: "layout",
      dependencies: ["@opentui/react"],
      description: "Flexbox container",
      name: "box",
      registryDependencies: ["opentui/use-theme"],
      title: "Box",
    });
  });

  test("sorts unknown categories after known ones, then by title", () => {
    const text = JSON.stringify({
      items: [
        { categories: ["zzz"], name: "opentui/a", title: "A", type: "registry:ui" },
        { categories: ["ai"], name: "opentui/c", title: "C", type: "registry:ui" },
        { categories: ["ai"], name: "opentui/b", title: "B", type: "registry:ui" },
      ],
    });

    expect(parseRegistry(text).map((entry) => entry.name)).toEqual(["b", "c", "a"]);
  });

  test("rejects a document without items", () => {
    expect(() => parseRegistry("{}")).toThrow("registry.json has no items array");
  });
});

describe("registry helpers", () => {
  test("shortens registry dependency URLs", () => {
    expect(shortRegistryDependency("https://termcn.dev/r/ink/use-animation.json")).toBe(
      "ink/use-animation"
    );
    expect(shortRegistryDependency("plain")).toBe("plain");
  });

  test("builds the shadcn install command", () => {
    const [entry] = parseRegistry(FIXTURE_REGISTRY);

    expect(entry === undefined ? "" : installCommand(entry)).toBe(
      "npx shadcn@latest add @termcn/opentui/box"
    );
  });
});
