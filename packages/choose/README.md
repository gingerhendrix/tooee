# @tooee/choose

Terminal selection with fuzzy filtering. `Choose` and `ChooseOverlay` are compatibility assemblies over the same reusable primitive:

- `useChoose()` owns normalized source loading, filtering, active/multi-selection state, commands, command context, and a stable controller.
- `ChooseFilter`, `ChooseList`, and `ChooseHighlightedText` are reusable controlled views.
- `ChoosePanel` supplies picker chrome and hint/status/footer slots.
- `Choose` retains the fullscreen app, theme picker, actions, and launch behavior.
- `ChooseOverlay` retains single-select menu semantics and adds optional multi-select, controller, command, row, and chrome extensions.

## Source and controller

`ChooseSource` accepts an item array, a `ChooseContentProvider`, or a sync/async loader. Replaced sources ignore stale async results. Successful replacements reset active and selected state; direct array changes are reflected just like loaders.

Use `controllerRef` on an assembly, or the controller returned by `useChoose`, to set/clear the filter, move or set the active row, toggle selection, submit/cancel, change mode, or reload the current source.

## Promise-based dialog

`useChooseDialog<T>()` opens `ChooseOverlay` as a modal dialog on the host's
overlay stack and resolves the typed selection:

```tsx
const choose = useChooseDialog<Model>()

const model = await choose.open({
  items: models, // readonly T[] or a sync/async loader
  toItem: (m) => ({ text: m.label }), // optional when T is a ChooseItem
  prompt: "Pick a model",
})
// T on select, T[] with { multi: true }, null on cancel/replacement/unmount
```

Generics are retained without casts: single-select resolves `T | null`,
multi-select resolves `T[] | null` (Choose selection semantics: toggled items,
falling back to the active item). Each `open()` owns one overlay record
(unique id per call) and one owned modal command surface; the promise settles
exactly once. The host must render overlay content (`AppLayout` does; custom
hosts render `useCurrentOverlay()`).

## Command surfaces

Built-in interaction uses `useCommand`, so a nested modal command surface suspends the chooser automatically. A filter also blurs while another modal surface owns input. Mouse events bypass command-surface arbitration; pass `suspended` to a custom `ChooseList` host when covered rows can remain visible.

`ChooseOverlay` expects its host to provide an owned modal command surface, either through Tooee's overlay manager (`ownCommands: true`, `role: "modal"`) or an explicit `CommandSurfaceProvider`. It does not create another surface internally.

Reserved built-in keys:

- Both modes: Up, Down, Ctrl+P, Ctrl+N, Enter.
- Insert mode: Escape and, for multi-select, Tab/Shift+Tab.
- Cursor mode: `j`, `k`, `i`, `a`, `q`, Escape and, for multi-select, Tab/Shift+Tab.

Consumer commands should prefer control chords, leader sequences, or other non-reserved keys. Built-in groups can be disabled through `useChoose({ disable: [...] })` when a custom host deliberately owns one.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo.
