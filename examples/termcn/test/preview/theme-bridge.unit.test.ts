import { expect, test } from "bun:test";

import { defaultTheme } from "@tooee/themes";

import { toTermcnTheme } from "../../preview/theme-bridge.js";

test("maps Tooee colors onto termcn tokens", () => {
  const { colors } = defaultTheme;
  const theme = toTermcnTheme("opencode", colors);

  expect(theme.name).toBe("tooee-opencode");
  expect(theme.colors.primary).toBe(colors.primary);
  expect(theme.colors.foreground).toBe(colors.text);
  expect(theme.colors.mutedForeground).toBe(colors.textMuted);
  expect(theme.colors.primaryForeground).toBe(colors.background);
  expect(theme.border).toEqual({
    color: colors.border,
    focusColor: colors.borderActive,
    style: "rounded",
  });
});
