## @tooee/fuzzy@0.7.2

### Add the Tooee documentation site

Tooee now includes a small searchable documentation site for `tooee.dev`, starting with an overview and CLI setup guide.

### Restore expected CLI view and exit behavior

Standalone ask and choose sessions now exit on Ctrl+C. View keeps `q` available in error and empty-directory states, honors persisted diff layouts, and includes CSV, TSV, diff, and patch files in directory browsing.

## @tooee/fuzzy@0.7.1

### Ship the compiled `@tooee/diff` output

`@tooee/diff@0.7.0` reached npm without its `dist` build, so importing the package, or opening a
diff through `@tooee/view`, failed to resolve. This release republishes the package with the
compiled entry point in place. Install `0.7.1` or later for diff rendering.

## @tooee/fuzzy@0.7.0

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

## @tooee/fuzzy@0.5.0

### Display native images in View

View can open PNG, JPEG, GIF, and WebP files through OpenTUI's native image renderer. Markdown now displays standard image links and Obsidian `![[image]]` embeds, including optional dimensions.

## @tooee/fuzzy@0.4.1

### Adopted tegami for version managment
