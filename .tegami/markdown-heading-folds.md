---
packages:
  "@tooee/view": minor
  "@tooee/renderers": minor
---

## Fold Markdown sections under their headings

The Markdown view can now fold the blocks under a heading. In cursor mode, `z a` toggles the fold at the cursor, `z c` closes it, `z o` opens it, `z M` closes all folds and `z R` opens them all. A closed heading shows `⋯ N blocks`, and the gutter keeps document numbers. Navigation, search, copy and clicks use the visible blocks. When a fold closes over the cursor, the cursor moves to the heading.

`MarkdownView` accepts `rowNumbers` and `foldedBlocks`, and the row document accepts `rowNumbers`, so hosts can render their own filtered block lists.
