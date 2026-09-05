## @tooee/panels@0.8.0

### Clarify package ownership and compatibility APIs

The low-level command store APIs now come from `@tooee/commands/store`. This entry owns
`CommandStoreInstance`, `ContextGetter`, `CreateCommandStoreOptions`, `KeyDispatchResult`,
`selectSurfaceCommandMap`, `selectGroups`, `ModeProvider`, `ModeProviderProps`,
`SequenceTracker`, its related sequence types, `createBaseStore`, and `createCommandStore`.
These names are no longer exported from the main `@tooee/commands` entry.

`CloseButton` moved from `@tooee/themes` to `@tooee/layout`. The `rankBy` compatibility
re-export was removed from `@tooee/renderers`; import it from `@tooee/fuzzy`.

The overlay store event payload types `OverlayClosedEmit`, `OverlayClosedEvent`,
`OverlayClosedTopEvent`, `OverlayOpenedEvent`, `OverlayStoreEvents`, and `OverlayUpdatedEvent`
are no longer exported from `@tooee/overlays`. `AnyRoute`, `ScreenFocusProvider`, and
`getRouteChain` are no longer exported from `@tooee/router`.

`useCommandContext` is deprecated in favor of `useSurfaceInvoke`. The overlay controller
methods `show`, `hide`, and `isOpen` are deprecated in favor of the handle returned by `open`
and overlay state hooks.

### Align public application contracts

The Ask, Choose, View, shell, and command-context APIs now use consistent
public contracts. See [the 0.8 migration guide](../docs/migration-0.7-to-0.8.md).

### Migration

- Ask launch now returns `string | null`. The CLI host now owns stdout writes
  and process exit. Choose launch keeps its `ChooseResult | null` result, and
  View launch resolves with `void` when its session ends.
- `Choose` accepts `title`, `prompt`, `placeholder`, `multi`, and `emptyMessage`
  as top-level props. Its `options` prop remains as a deprecated alias for one
  release. Use `actions` instead of the deprecated `commands` alias.
- `CommandContext` augmentations such as `ask`, `choose`, `view`, `overlay`, and
  `toast` are optional. Check that a field is present before use.
- Deprecated top-level `launchCli` provider aliases and the `tooee table`
  command remain available until 0.9.0.

## @tooee/panels@0.7.3

### Add explicit clipboard shortcuts

View documents and Ask editors now use `yy` to copy the current semantic row or
line, `yg` to copy the whole document, and `yv` to copy the active selection.

## @tooee/panels@0.7.2

### Add the Tooee documentation site

Tooee now includes a small searchable documentation site for `tooee.dev`, starting with an overview and CLI setup guide.

### Restore expected CLI view and exit behavior

Standalone ask and choose sessions now exit on Ctrl+C. View keeps `q` available in error and empty-directory states, honors persisted diff layouts, and includes CSV, TSV, diff, and patch files in directory browsing.

## @tooee/panels@0.7.1

### Ship the compiled `@tooee/diff` output

`@tooee/diff@0.7.0` reached npm without its `dist` build, so importing the package, or opening a
diff through `@tooee/view`, failed to resolve. This release republishes the package with the
compiled entry point in place. Install `0.7.1` or later for diff rendering.

## @tooee/panels@0.7.0

### Render diffs with Hunk

Patches are now a first-class Tooee format. `tooee view changes.patch` (or piping `git diff` into
`tooee view`) opens a diff viewer built on Hunk's OpenTUI primitives, with stacked and split
layouts, word-level highlights and multi-file review.

Navigation is per hunk: `j`/`k` step between hunks, `]`/`[` jump between files, `f` opens a file
picker, `s` toggles split, `w` toggles wrapping, and `h`/`l` pan wide hunks. Search, copy and
selection all work in real patch text.

Markdown ` ```diff ` and ` ```patch ` fences render as diff blocks too, with `split`, `nolines` and
`wrap` options in the fence info string. Fences that are not real unified diffs keep falling back
to the syntax-highlighted code block.

## @tooee/panels@0.5.0

### Display native images in View

View can open PNG, JPEG, GIF, and WebP files through OpenTUI's native image renderer. Markdown now displays standard image links and Obsidian `![[image]]` embeds, including optional dimensions.

## @tooee/panels@0.4.1

### Adopted tegami for version managment
