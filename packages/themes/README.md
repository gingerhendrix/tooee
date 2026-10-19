# @tooee/themes

Theme management with 34 bundled themes for Tooee.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

## OpenTUI 0.6 migration

`Theme` (from `buildTheme()` or `defaultTheme`) contains `name`, `mode` and `colors`; it no longer contains `syntax`. A `SyntaxStyle` belongs to one renderer's native context. Components should read `useTheme().syntax` under `ThemeProvider` or `ThemeSwitcherProvider`. For imperative use, call `buildSyntaxStyle(theme.colors, renderer.nativeScene)`. Do not share that style between renderers; the native context releases it when the renderer closes.
