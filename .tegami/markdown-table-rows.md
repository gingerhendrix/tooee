---
packages:
  "@tooee/renderers": minor
  "@tooee/view": patch
---

## One document row per Markdown table row

In `MarkdownView` and the Markdown view of `@tooee/view`, each table row is now its own document row. The header row and every body row get their own gutter number, cursor position, selection, mark, search hit and copy text. Before, a whole table was one row.

`flattenMarkdown` now returns one `FlatBlock` for the header row and one for each body row, in place of one block per table. This applies to tables inside list items too. Each row block has:

- `kind`: `"table-row"`.
- `row`: a new `FlatTableRow` with the parent `table`, the row `index` (`0` is the header, body rows start at `1`) and the row's Markdown line as `raw`. All rows of one table share the same `table` object.
- `source`: a span over that row's line only. The delimiter line (`| --- |`) is not part of any row.

`getFlatBlockText` returns the row's Markdown line, such as `| Bob | ops |`, so search and copy work on one row.

Code that counts blocks or stores block indices sees more blocks for each table, and every index after a table moves. Indices saved by an earlier version, such as comment anchors keyed by rendered row, point at a different block after a table. Re-anchor them by source line where possible. A table row block has no `token`. Use `getFlatBlockText` or `row.raw` for the row's text, and `row.table` for the whole table.

The table keeps its bordered grid. All rows of a table share one set of column widths. Links in table cells stay clickable and keep their OSC 8 hyperlinks. `MarkdownView` no longer registers OpenTUI's `text-table` element, because Markdown tables now draw each cell as its own text.
