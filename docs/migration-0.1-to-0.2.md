# Migrating documents from Tooee 0.1 to 0.2

Tooee 0.2 introduces a typed shell document controller and authoritative source-backed renderer rows. The APIs are additive in 0.2.x: existing View applications can migrate incrementally, but new custom documents should use the controller rather than combining navigation, search, copy, scrolling, and mouse state independently.

See [Shell document API](./shell-document.md) for the complete contract and a typechecked application.

## Package versions

Upgrade related Tooee packages together so their shared contracts agree:

```json
{
  "dependencies": {
    "@tooee/renderers": "^0.2.1",
    "@tooee/shell": "^0.2.1"
  }
}
```

Use the current 0.2.x patch in a real application. The examples here describe the API available in 0.2.1.

## Replace separate interaction hooks with one controller

A 0.1 custom screen commonly owned row count, navigation, search, copy, scroll-follow, and click mapping separately. In 0.2, define one row array and adapter:

```tsx
const controller = useDocumentController({
  rows,
  adapter: {
    getKey: (row) => row.id,
    getText: (row) => row.title,
    isSelectable: (row) => row.kind !== "separator",
    getSource: (row) => row.source,
  },
  search: {},
  multiSelect: true,
  preserveCursorByKey: true,
});

return (
  <DocumentScreen controller={controller} titleBar={{ title: "Items" }}>
    <Document controller={controller} renderRow={(row) => <text content={row.title} />} />
  </DocumentScreen>
);
```

Keep one direct rendered host row per model row, in the same order. Delete duplicate row-count, cursor-repair, search matching, copy-range, scroll-follow, and screen-Y mapping code only after behavior tests pass.

## Move domain actions to `ctx.document`

Replace content-specific cursor snapshots used only to identify the active generic row:

```ts
// Before: consumer-owned cursor plus a separately indexed row array
const row = rows[ctx.view.cursor];

// After: bounded command snapshot
const row = ctx.document?.activeRow;
const anchor = ctx.document?.activeAnchor;
```

Keep content-specific state in its owning context. For example, a View action may still read `ctx.view.content`, while row identity and source provenance come from `ctx.document`.

In component code, prefer the typed `controller.activeRow` and `controller.activeAnchor`. Command context rows are `unknown` by design.

## Give dynamic rows stable keys

In 0.1, index-based cursor state could silently move to a different item after sorting or filtering. In 0.2, provide `adapter.getKey` and opt into `preserveCursorByKey` when row identity should survive replacement:

```ts
getKey: (row) => row.id,
preserveCursorByKey: true,
```

Do not use a source offset as a row key unless source location truly defines domain identity. Source coordinates and interactive row identity are separate contracts.

## Migrate Markdown from `flattenTokens` to `flattenMarkdown`

`flattenTokens(tokens)` is deprecated in 0.2. It remains available only as an unmapped compatibility helper and is planned for removal in **0.3.0**. Marked tokens do not contain reliable source positions, so every block returned by `flattenTokens` has `source: null`.

Before:

```ts
import { marked } from "marked";
import { flattenTokens } from "@tooee/renderers";

const blocks = flattenTokens(marked.lexer(markdown));
```

After:

```ts
import { flattenMarkdown, getFlatBlockText } from "@tooee/renderers";
import type { DocumentRowAdapter } from "@tooee/shell";
import type { FlatBlock } from "@tooee/renderers";

const blocks = flattenMarkdown(markdown, { sourceId: "README.md" });

const adapter: DocumentRowAdapter<FlatBlock> = {
  getText: getFlatBlockText,
  getSource: (block) => block.source,
};
```

Pass `blocks` both to `useDocumentController({ rows: blocks, adapter })` and to `<MarkdownView content={markdown} blocks={blocks} document={controller} />`. This makes rendering, navigation, search, copy, and source anchors share one authoritative row order.

Remove a direct `marked` dependency if it was used only for this flattening/mapping path. Do not try to recover offsets by pairing separately produced tokens with a source string.

## Replace custom Markdown source mapping with anchors

Delete consumer-side token searches, line-at-offset helpers, and parallel source-map arrays. For a live action:

```ts
const anchor = ctx.document?.activeAnchor;
const source = anchor?.source?.primary;

const renderedRow = anchor?.index;
const sourceStartLine = source?.start.line;
const sourceEndLine = source?.lastLine;
const sourceText = source?.lineText ?? anchor?.text;
```

For offline normalization, build the same rows without React:

```ts
const anchors = flattenMarkdown(markdown, { sourceId: path }).map((block, index) => ({
  renderedRow: index,
  renderedText: getFlatBlockText(block),
  source: block.source?.primary ?? null,
}));
```

Repeated blocks, nested/synthetic list rows, multiline blocks, CRLF, and Unicode are handled by Tooee's source mapper. Preserve an index/text fallback for the explicit `source: null` case.

## Migrate code and plain text to `sourceLines`

Replace `source.split("\n")` plus custom offset arithmetic with:

```ts
import { sourceLines, sourceLineAdapter } from "@tooee/renderers";

const rows = sourceLines(source, { sourceId: filePath });
const controller = useDocumentController({ rows, adapter: sourceLineAdapter });
```

This preserves empty input and final-empty-line behavior, treats CRLF as one line break, and retains offsets into the original source. Render `row.text`; read provenance from `row.source` or a controller anchor.

## Bind existing renderers narrowly

If a renderer already owns its row markup, add `document?: DocumentBindings` and attach its three fields to the `row-document`. Do not make renderer packages depend on `DocumentController<T>`:

```tsx
<row-document
  ref={document?.ref}
  decorations={document?.decorations}
  onMouseDown={document?.onMouseDown}
>
  {rows.map(renderOneDirectHostChild)}
</row-document>
```

For ordinary custom rows, replace this manual wiring with `<Document>`.

## Mouse migration

Replace row-level click handlers and hand-written screen geometry with controller options:

```ts
const controller = useDocumentController({
  rows,
  adapter,
  onRowPress: ({ row }) => openRow(row),
  contextMenu: ({ row }) => menuEntriesFor(row),
});
```

The controller ignores modal-obscured clicks and trailing space, supports variable-height geometry, selects before opening a right-click menu, and invokes selected menu entries as command IDs. Keep menu policy and domain entries in the application.

## Migration checklist

- [ ] Related Tooee packages use compatible 0.2.x versions.
- [ ] One authoritative typed row array drives controller and renderer.
- [ ] Dynamic rows have stable keys; key preservation is enabled only where wanted.
- [ ] Renderer rows have a one-model-row/one-direct-host-child contract.
- [ ] Generic command actions read `ctx.document`.
- [ ] `flattenTokens` and consumer-side Markdown lexing/mapping are removed.
- [ ] Markdown uses `flattenMarkdown`, `getFlatBlockText`, and controller anchors.
- [ ] Code/text uses `sourceLines` rather than normalized split/offset logic.
- [ ] Mouse behavior is tested for variable-height rows, gaps, modal overlays, and right-click ordering.
- [ ] Existing persistence schemas are preserved; convert Tooee anchors at the application boundary.
- [ ] Typecheck and behavior tests pass before deleting compatibility code.

## 0.3.0 preparation

Before upgrading to 0.3.0, ensure repository search finds no import or call of `flattenTokens`. The planned removal affects the deprecated helper only; `flattenMarkdown`, `sourceLines`, source coordinate types, row anchors, and the shell document API are the supported migration targets.
