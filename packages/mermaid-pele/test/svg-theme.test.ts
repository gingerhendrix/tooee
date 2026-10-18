import { describe, expect, test } from "bun:test";

import { defaultTheme } from "@tooee/themes";
import { render } from "pele";

import { inlineCssVariables, peleVariablesFromTheme } from "../src/svg-theme.js";

const variables = new Map([
  ["pele-bg", "#000000"],
  ["pele-fg", "#ffffff"],
  ["pele-surface-alt", "#ff0000"],
]);

describe("inlineCssVariables", () => {
  test("resolves private tokens through public tokens and fallbacks", () => {
    const svg =
      '<svg style="--_bg:var(--pele-bg,#fff);--_m:var(--pele-muted,#6e6e6e)"><rect fill="var(--_bg)" stroke="var(--_m)"/></svg>';

    expect(inlineCssVariables(svg, variables)).toBe(
      '<svg style=""><rect fill="#000000" stroke="#6e6e6e"/></svg>'
    );
  });

  test("mixes srgb colors once both sides are literal", () => {
    const svg =
      '<svg style="--_a:var(--pele-surface-alt);--_bg:var(--pele-bg)"><rect fill="color-mix(in srgb,var(--_a) 50%,var(--_bg))"/></svg>';

    expect(inlineCssVariables(svg, variables)).toContain('fill="#800000"');
  });

  test("leaves no var() in real Pele output", () => {
    const { svg } = render("flowchart LR\n  A[Start] --> B{Ok?}\n  B -- yes --> C[Done]");
    const themed = peleVariablesFromTheme(defaultTheme.colors, "sans-serif", "monospace");

    expect(inlineCssVariables(svg, themed)).not.toContain("var(");
  });
});
