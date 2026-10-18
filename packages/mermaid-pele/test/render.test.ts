import { describe, expect, test } from "bun:test";

import { defaultTheme } from "@tooee/themes";

import { createPeleRenderCache, renderPeleDiagram } from "../src/render.js";
import { peleVariablesFromTheme } from "../src/svg-theme.js";

const variables = peleVariablesFromTheme(defaultTheme.colors, "sans-serif", "monospace");

const FLOWCHART = "flowchart LR\n  A[Start] --> B{Ok?}\n  B -- yes --> C[Done]";

// Unquoted parentheses in an edge label: beautiful-mermaid accepts this, Pele rejects it.
const PELE_REJECTS = "flowchart LR\n  A -->|HTTP SSE<br/>(Shapes)| B";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

describe("renderPeleDiagram", () => {
  test("renders a flowchart to a themed SVG and a PNG", () => {
    const result = renderPeleDiagram(FLOWCHART, { scale: 1, variables });

    if (!result.ok) {
      throw new Error(`expected a diagram, got ${result.stage}: ${result.message}`);
    }

    expect(result.type).toBe("flowchart");
    expect(result.svg).not.toContain("var(");
    expect(result.png.subarray(0, 4)).toEqual(new Uint8Array(PNG_MAGIC));
    expect(result.pngWidth).toBe(Math.ceil(result.svgWidth));
  });

  test("doubles the raster size at scale 2", () => {
    const result = renderPeleDiagram(FLOWCHART, { scale: 2, variables });

    if (!result.ok) {
      throw new Error(`expected a diagram, got ${result.stage}: ${result.message}`);
    }

    expect(result.pngWidth).toBe(Math.ceil(result.svgWidth * 2));
  });

  test("returns a Pele-stage failure for source Pele rejects", () => {
    const result = renderPeleDiagram(PELE_REJECTS, { variables });

    expect(result).toMatchObject({ code: "syntax", ok: false, stage: "pele" });
  });

  test("returns a failure, without throwing, for text that is not Mermaid", () => {
    expect(renderPeleDiagram("this is not valid mermaid {{{", { variables }).ok).toBe(false);
  });
});

describe("createPeleRenderCache", () => {
  test("returns the cached result for the same source and theme", () => {
    const cache = createPeleRenderCache();
    const first = cache.render(FLOWCHART, { variables });

    expect(cache.render(FLOWCHART, { variables })).toBe(first);
    expect(cache.size).toBe(1);
  });

  test("renders again when the theme or scale changes", () => {
    const cache = createPeleRenderCache();
    const first = cache.render(FLOWCHART, { variables });
    const light = new Map(variables).set("pele-bg", "#ffffff");

    expect(cache.render(FLOWCHART, { variables: light })).not.toBe(first);
    expect(cache.render(FLOWCHART, { scale: 1, variables })).not.toBe(first);
    expect(cache.size).toBe(3);
  });

  test("evicts the least recently used entry over the limit", () => {
    const cache = createPeleRenderCache(2);
    const a = cache.render("flowchart LR\n  A --> B", { variables });
    cache.render("flowchart LR\n  C --> D", { variables });
    cache.render("flowchart LR\n  A --> B", { variables });
    cache.render("flowchart LR\n  E --> F", { variables });

    expect(cache.size).toBe(2);
    expect(cache.render("flowchart LR\n  A --> B", { variables })).toBe(a);
  });
});
