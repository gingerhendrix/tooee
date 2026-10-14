---
packages:
  "@tooee/renderers": minor
  "@tooee/view": patch
---

## `FlatBlock` is a tagged union

`FlatBlock` from `@tooee/renderers` is now a union of block types. Each block has a `kind` field, plus the `indent` and `source` fields that every block shares:

| `kind`         | Other fields                                                                   |
| -------------- | ------------------------------------------------------------------------------ |
| `"heading"`    | `token: Tokens.Heading`                                                        |
| `"paragraph"`  | `token: Tokens.Paragraph`                                                      |
| `"code"`       | `token: Tokens.Code`                                                           |
| `"blockquote"` | `token: Tokens.Blockquote`                                                     |
| `"hr"`         | `token: Tokens.Hr`                                                             |
| `"list-line"`  | `token: Tokens.Text \| Tokens.Paragraph`, `bullet: string`, optional `checked` |
| `"table-row"`  | `row: FlatTableRow` (no `token`)                                               |
| `"other"`      | `token: Token`                                                                 |

Check `block.kind` to narrow a block. TypeScript then gives you the typed Marked token, so you do not need a type assertion. For example, `block.kind === "heading" ? block.token.depth : null`.

To upgrade:

- Replace `block.bullet !== undefined` with `block.kind === "list-line"`. Only the first line of a list item has `bullet` and `checked`.
- Replace `block.tableRow` with `block.kind === "table-row"` and `block.row`.
- Code that reads `block.token` must narrow first, because a `table-row` block has no `token`.

`source`, `indent`, `flattenMarkdown` and `getFlatBlockText` do not change. Each block type is exported as its own type, such as `FlatHeadingBlock` and `FlatTableRowBlock`, and `FlatBlockKind` is the union of the `kind` values.

`flattenMarkdown` returns the same blocks in the same order as before. Rendering does not change.
