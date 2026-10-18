import { describe, expect, test } from "bun:test";

import type { TerminalCapabilities } from "@opentui/core";

import { supportsDiagramImages } from "../src/image-support.js";

const capabilities = function capabilities(
  overrides: Partial<TerminalCapabilities>
): TerminalCapabilities {
  return {
    ansi256: true,
    bracketed_paste: true,
    color_scheme_updates: false,
    explicit_cursor_positioning: false,
    explicit_width: false,
    focus_tracking: false,
    hyperlinks: false,
    kitty_graphics: false,
    kitty_keyboard: false,
    multiplexer: "none",
    notifications: false,
    osc52: false,
    osc52_support: "unknown",
    remote: false,
    rgb: true,
    scaled_text: false,
    sgr_pixels: false,
    sixel: false,
    sync: false,
    terminal: { from_xtversion: false, name: "test", version: "1" },
    unicode: "unicode",
    ...overrides,
  };
};

const resolution = { height: 800, width: 1000 };

describe("supportsDiagramImages", () => {
  test("accepts auto on a kitty graphics terminal", () => {
    expect(
      supportsDiagramImages("auto", {
        capabilities: capabilities({ kitty_graphics: true }),
        resolution,
      })
    ).toBe(true);
  });

  test("rejects auto inside tmux, where OpenTUI falls back to blocks", () => {
    expect(
      supportsDiagramImages("auto", {
        capabilities: capabilities({ kitty_graphics: true, multiplexer: "tmux" }),
        resolution,
      })
    ).toBe(false);
  });

  test("rejects auto before the terminal reports capabilities", () => {
    expect(supportsDiagramImages("auto", { capabilities: null, resolution: null })).toBe(false);
  });

  test("rejects sixel without a pixel resolution", () => {
    expect(
      supportsDiagramImages("sixel", {
        capabilities: capabilities({ sixel: true }),
        resolution: null,
      })
    ).toBe(false);
  });

  test("accepts an explicit blocks request", () => {
    expect(supportsDiagramImages("blocks", { capabilities: null, resolution: null })).toBe(true);
  });
});
