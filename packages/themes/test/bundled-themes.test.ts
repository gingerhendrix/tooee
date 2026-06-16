import { expect, test } from "bun:test"
import { loadThemes, resolveTheme } from "@tooee/themes"

// OpenTUI's hexToRgb accepts 3/4-digit shorthand as well as 6/8-digit hex
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

for (const [name, json] of loadThemes()) {
  for (const mode of ["dark", "light"] as const) {
    test(`bundled theme "${name}" resolves in ${mode} mode`, () => {
      const resolved = resolveTheme(json, mode)
      for (const [key, value] of Object.entries(resolved)) {
        expect(value, `${name}.${key} (${mode})`).toMatch(HEX)
      }
    })
  }
}
