# @tooee/diff

Unified and split diff rendering for Tooee, drawn by [Hunk](https://github.com/modem-dev/hunk)'s
public OpenTUI primitives (`hunkdiff/opentui`).

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for
documentation.

## What it provides

- `buildDiffModel(patch)` — parses unified patch text into navigation rows: one row per file
  header and one per `@@` hunk, each carrying its own patch text and its span in the original
  patch.
- `DiffView` — a `row-document` whose rows are those diff rows. The row document stays the only
  scroll owner, so the cursor, search decorations, marks, scroll-follow and mouse routing all keep
  working.
- `diffCodeBlockRenderer` / `DIFF_CODE_BLOCK_RENDERERS` — a Markdown code-block renderer that
  draws ` ```diff ` and ` ```patch ` fences as Hunk blocks. `@tooee/view` registers it by default.
- `resolveHunkDiffTheme` — maps a Tooee theme onto the closest bundled Hunk theme.
- `isDiffPatch` — content sniffing for patch text.

`@tooee/diff` is the only package that imports `hunkdiff`. `@tooee/renderers` stays free of it.

## Row model

Hunk renders a whole file at a time, but a diff is only pleasant to navigate hunk by hunk. A hunk
row therefore carries a copy of its file whose `metadata.hunks` is narrowed to a single hunk while
the whole-file line arrays stay intact — so line numbers and the `··· N unchanged lines ···`
counts still resolve against the complete file.

Files Hunk renders without hunks (binary, too large, untracked) contribute one `body` row instead,
so the notice Hunk draws for them is still shown.

## Fence options

Words after the fence type are read as options; unknown words are ignored.

    ```diff split nolines wrap

| Word      | Effect                                                       |
| --------- | ------------------------------------------------------------ |
| `split`   | Side-by-side layout (falls back to stacked below 80 columns) |
| `nolines` | Hides Hunk's line-number columns                             |
| `wrap`    | Wraps long lines instead of clipping them                    |

A fence whose body is not a real unified diff — prose-style `+`/`-` bullets, for instance —
returns `null` and falls back to the default syntax-highlighted code block.

## Known limits

- **Line-number column width is per hunk.** Hunk sizes its line-number columns from the hunks it
  is given, and each hunk row is given one hunk, so two hunks of the same file can differ by a
  column when their line numbers differ in digit count. Everything else — collapsed-gap counts,
  content, word-level highlights — matches a whole-file render.
- **Themes are approximated.** Hunk resolves one of its own bundled palettes by name and accepts
  no custom colour table, so each Tooee theme is mapped to the closest bundled Hunk theme rather
  than reproduced exactly. Unmapped (user) themes fall back to GitHub's palette on the matching
  light/dark side.
- **Marks are not painted inside hunks.** Row-level decorations (cursor, search, selection, marks)
  paint under the row, but Hunk draws its own backgrounds over most of it, so a mark on a diff row
  reads mainly from the gutter sign.
- **Diff content is replace-only when streaming.** `ContentChunk`'s `append` does not accept
  `diff`; send the full patch through a `replace` chunk instead.
- **Peer range.** `hunkdiff@0.18.0` declares `@opentui/core`/`@opentui/react` `^0.4.3`. It runs and
  type-checks against Tooee's `0.5.1`, and Bun resolves it without a warning inside this workspace,
  but a standalone install of `@tooee/diff` may print a peer-dependency warning until Hunk widens
  the range. The version is pinned exactly because Hunk is pre-1.0.
- **Install weight.** `hunkdiff` declares the `bun` npm package as a runtime dependency and ships a
  prebuilt CLI binary as an optional one, neither of which `hunkdiff/opentui` imports. Adding this
  package grew the local Bun store by roughly 580 MB, of which about 400 MB is the Bun binary and
  its platform variants and 134 MB is `hunkdiff-linux-x64`. Only the ~18 MB `hunkdiff/opentui`
  bundle is actually used. Fixing this needs an upstream packaging change; `bun patch` cannot drop
  a declared dependency from the resolution graph.
