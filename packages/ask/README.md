# @tooee/ask

Terminal text input gathering.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

## Architecture

Three layers, each independently exported:

- `useAskEditor()` — headless core. Owns editor state and registers all editing
  commands (vim motions, insert entries, submit/cancel/escape) on the nearest
  command surface. Returns a `controller` (programmatic text control: `getText`,
  `setText`, `insertText`, `setCursorToEnd`, `submit`, `mode`/`setMode`) and an
  `editor` view-model for `<AskEditor/>`.
- `<AskEditor/>` / `<AskPanel/>` — presentational parts. `AskEditor` renders the
  themed textarea/input plus scrollbar; `AskPanel` is the bordered panel chrome
  with `title`, `prompt`, `hints`, `statusRight`, `footer`, and `inset` slots.
  `buildAskHints(mode, { multiline, extra })` builds the default hint entries.
- `<Ask/>` (fullscreen), `<AskOverlay/>` (embedded), `launch()` — thin
  assemblies of the core. `AskOverlay` additionally accepts `commands`
  (extra `ActionDefinition[]` on this surface), `controllerRef`, chrome
  pass-throughs, and `children` for nested overlays.

Composites that open a nested picker should wrap it in a modal
`CommandSurfaceProvider` — while mounted it owns the keyboard, and every ask
command plus editor focus suspends automatically; no `when` guards or
`pickerOpen` props are needed.

The low-level vim helpers (`handleEditBufferVimMotion`, `appendAtCursor`,
`openLineAtCursor`) are exported for non-React or custom hosts.

## Promise-based dialog

`useAskDialog()` opens `AskOverlay` as a modal dialog on the host's overlay
stack and resolves the result:

```tsx
const ask = useAskDialog();

const value = await ask.open({ prompt: "Commit message" });
// string on submit, null on cancel/replacement/unmount
```

Each `open()` owns one overlay record (unique id per call — concurrent dialogs
stack instead of replacing each other) and one owned modal command surface, so
host commands suspend and the host's global mode is never touched. The promise
settles exactly once. Options pass through to `AskOverlay` (`title`,
`multiline`, `defaultValue`, `placeholder`, `commands`, `controllerRef`, and
chrome slots). Dialog `commands` may open nested dialogs (for example a typed
`useChooseDialog()` picker); the nested surface suspends the editor and focus,
value, and local mode are restored when it settles. The host must render
overlay content (`AppLayout` does; custom hosts render `useCurrentOverlay()`).

## Reserved keys

Cursor mode: `h j k l 0 $ w b g G i a o O q Escape Enter Shift+Enter`, arrows,
`home`/`end`. Insert mode: `Escape`, the submit key(s).

Consumers extending with `commands` should avoid these; `m`, `d`, `x`, `c`, and
ctrl-chords are free today. Future vim work (`x`, `dd`, counts) will claim more
single letters — composites should prefer ctrl-chords or leader sequences for
anything beyond one or two mnemonic keys.
