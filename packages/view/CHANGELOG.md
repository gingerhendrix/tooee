## @tooee/view@0.9.0

### Keep terminal UI output out of shell results

Ask, Choose, and View now use the controlling terminal for interactive input and screen output when process streams carry piped or redirected data. Command substitution and pipelines receive clean result text. Piped View sessions remain interactive after stdin closes.

### Follow local Markdown links in standalone view

Click a local Markdown link or press Enter on its source line in cursor mode to open the linked file in the same session. When the line holds several links, Enter opens a chooser listing them by text and destination. Use Backspace in cursor mode or Go back in the command palette to return. Fragments open at the file top; missing files, directories, and unsupported links show toasts. Launchers can register synchronous `linkHandlers` before the built-in local file handler. Links from stdin show an informational toast because navigation needs a source file.

### Remove the 0.8 compatibility APIs

Tooee 0.9 removes the compatibility forms deprecated in 0.8. `Choose` now
accepts only direct chooser props and `actions`; `launchCli` provider settings
must be nested under `provider`; and `AppLayout` scrolling must use `scroll`.

The config color type is now only `ColorMode`, command surfaces use
`useSurfaceInvoke`, and overlays use handles plus state hooks instead of
`show`, `hide`, and `isOpen`. The `tooee table` command has also been removed;
use `tooee view --renderer table`.

See [the 0.9 migration guide](../docs/migration-0.8-to-0.9.md) for replacements.

## @tooee/view@0.8.0

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

### Add named hook and table formatting contracts

Export named result and option types for router, shell, and view hooks. Export `formatTableCell` as the shared table value formatter. Date cells now use the same ISO text for display, whole-document copy, row copy, and search.

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

## @tooee/view@0.7.3

### Add explicit clipboard shortcuts

View documents and Ask editors now use `yy` to copy the current semantic row or
line, `yg` to copy the whole document, and `yv` to copy the active selection.

## @tooee/view@0.7.2

### Add the Tooee documentation site

Tooee now includes a small searchable documentation site for `tooee.dev`, starting with an overview and CLI setup guide.

### Restore expected CLI view and exit behavior

Standalone ask and choose sessions now exit on Ctrl+C. View keeps `q` available in error and empty-directory states, honors persisted diff layouts, and includes CSV, TSV, diff, and patch files in directory browsing.

### Provide View context when Markdown links activate

Markdown link handlers on `View` now receive the live command context with the raw link URL. Existing one-argument handlers continue to work.

## @tooee/view@0.7.1

### Ship the compiled `@tooee/diff` output

`@tooee/diff@0.7.0` reached npm without its `dist` build, so importing the package, or opening a
diff through `@tooee/view`, failed to resolve. This release republishes the package with the
compiled entry point in place. Install `0.7.1` or later for diff rendering.

## @tooee/view@0.7.0

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

## @tooee/view@0.5.0

### Display native images in View

View can open PNG, JPEG, GIF, and WebP files through OpenTUI's native image renderer. Markdown now displays standard image links and Obsidian `![[image]]` embeds, including optional dimensions.

## @tooee/view@0.4.1

### Adopted tegami for version managment
