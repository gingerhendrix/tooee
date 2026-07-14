# Shell document API

The document API in `@tooee/shell` turns a typed row array into an interactive document. It owns generic interaction mechanics—navigation, selection, search, copy, decorations, scroll-follow, mouse hit testing, and command context—while the application owns its row model, rendering, and domain actions.

This guide describes the API shipped in Tooee 0.2.1.

## A minimal source-aware document

The complete, CI-typechecked version is [`../examples/source-aware-document.tsx`](../examples/source-aware-document.tsx).

```tsx
import { useMemo } from "react";
import { sourceLines, sourceLineAdapter } from "@tooee/renderers";
import { Document, DocumentScreen, launchCli, useDocumentController } from "@tooee/shell";

function SourceDocument({ source }: { source: string }) {
  const rows = useMemo(() => sourceLines(source, { sourceId: "notes.txt" }), [source]);
  const controller = useDocumentController({
    rows,
    adapter: sourceLineAdapter,
    search: {},
    preserveCursorByKey: false,
  });

  return (
    <DocumentScreen controller={controller} titleBar={{ title: "Notes" }}>
      <Document
        controller={controller}
        style={{ flexGrow: 1 }}
        renderRow={(row) => <text content={row.text || " "} />}
      />
    </DocumentScreen>
  );
}

void launchCli(<SourceDocument source={"first line\nsecond line\n"} />);
```

`launchCli` installs `TooeeProvider`, so the hook has the theme, command, overlay, and clipboard providers it needs. If an application already mounts Tooee, render the component beneath its existing `TooeeProvider` instead.

## Row model and adapter

`useDocumentController<T>(options)` is generic in the consumer's row type. Its required inputs are one authoritative `rows: readonly T[]` and a `DocumentRowAdapter<T>`:

```ts
interface DocumentRowAdapter<T> {
  getKey?: (row: T, index: number) => React.Key;
  getText: (row: T, index: number) => string;
  isSelectable?: (row: T, index: number) => boolean;
  getSource?: (row: T, index: number) => DocumentRowSource | null;
}
```

- `getText` is semantic plain text used by default search, copy, and anchors. It need not be identical to visual markup, but it should describe what the user sees.
- `isSelectable` defaults to `true`. Return `false` for headers, separators, and other rows the cursor must skip.
- `getSource` is optional. Return source provenance when a rendered row represents original input; return `null` for generated rows. Omitting it is equivalent to returning `null`.
- `getKey` supplies row identity. Without it, the row index is the key.

### Stable row keys

Use a key derived from immutable domain identity whenever rows can sort, filter, reload, or reorder:

```ts
const adapter: DocumentRowAdapter<Issue> = {
  getKey: (issue) => issue.id,
  getText: (issue) => `${issue.title} ${issue.author}`,
};
```

Set `preserveCursorByKey: true` to keep the cursor on the same key across a new `rows` array. Toggled multi-selection is key-backed whenever `getKey` exists. If the active key disappears, the controller clamps to a nearby selectable row. Source identity is deliberately separate: a `SourceSpan` says where content came from; `getKey` says whether two rows are the same interactive row.

Use index identity only when position really is identity, such as `sourceLines()` output that is not reordered.

## Controller options and state

The principal signature is:

```ts
function useDocumentController<T>(options: UseDocumentControllerOptions<T>): DocumentController<T>;
```

Important options are:

- `multiSelect?: boolean` enables Tab-based toggled selection in addition to range selection.
- `search?: false | { match?: (query, rows) => readonly number[] }` enables search by default. Pass `false` to register no search commands and expose `controller.search === null`.
- `copy?: boolean` controls the select-mode copy command; the default is `true`.
- `decorations?: readonly DecorationLayer[]` adds application layers to the controller's cursor, selection, toggle, and search layers.
- `preserveCursorByKey?: boolean` opts into key-based cursor reconciliation.
- `onRowPress` and `contextMenu` configure mouse behavior.

The controller exposes `rows`, `navigation`, optional `search`, `activeIndex`, `activeKey`, `activeRow`, `selectedRows`, `toggledIndices`, anchors, renderer bindings, and row helpers. `getRow(index)` returns `undefined` out of range; `getAnchor(index)` returns `null` out of range.

## `Document` and `DocumentScreen`

`Document<T>` is the normal renderer for custom typed rows. It creates a bound `row-document`, supplies `controller.ref`, decorations, and mouse handler, and maps each model row to exactly one direct host `<box>` child. `renderRow` must therefore produce the contents of one model row; do not emit multiple sibling row hosts for one item.

Props accepted by the underlying `row-document`—for example `style`, palette, gutter, and line-number options—can also be passed, except for the bindings owned by the controller.

`DocumentScreen<T>` supplies standard application chrome and integration:

- application actions through `useActions`;
- theme and quit commands (both independently disableable);
- `ctx.document` command context;
- title/status/search layout;
- Theme, Mode, Cursor, selection count, and active search status.

It does not own routing, loading, domain status, or row rendering. Put `Document` or a renderer accepting `DocumentBindings` inside it.

## `DocumentBindings` and renderer contracts

Low-level renderers should depend on `DocumentBindings`, not on the generic controller:

```ts
interface DocumentBindings {
  ref: React.RefObject<RowDocumentRenderable | null>;
  decorations: readonly DecorationLayer[];
  onMouseDown(event: MouseEvent): void;
}
```

This narrow contract lets a renderer provide row geometry, paint decorations, and forward mouse input without learning the consumer's row type. `DocumentController<T>` extends `DocumentBindings`, so it can be passed directly to a renderer's `document` prop. For example, `MarkdownView` accepts `document?: DocumentBindings` and `blocks?: readonly FlatBlock[]`; supplying the same blocks to the controller and renderer prevents row-order drift.

A custom renderer using these bindings must:

1. attach `ref`, `decorations`, and `onMouseDown` to one `row-document`;
2. produce one direct host child for each controller row, in exactly the same order;
3. avoid stopping mouse propagation unless it intentionally owns that interaction.

Prefer `Document` when these constraints are sufficient; it wires the contract correctly by construction.

## Mouse behavior

Mouse handling is geometry-based, so variable-height rows are supported. `getRowAtScreenY(screenY)` asks the mounted `row-document` for the model row at an absolute screen Y coordinate and returns `{ row, index, key }`, or `null` for gaps, outside rows, and trailing empty space.

The bound `onMouseDown` behavior is:

- while a modal overlay is open, all document mouse handling stands down;
- left click selects the hit row, then calls `onRowPress`;
- right click calls `preventDefault()`, selects the row first, builds menu entries, and opens the Tooee context menu;
- other buttons and clicks without a row are ignored.

`contextMenu` may be `false`, a static `ContextMenuEntry[]`, or a callback receiving `{ row, index, key, event, context }`. Entries are command IDs; selecting one invokes that command. The callback's `context` is built after the row is selected, but React state publication is asynchronous, so derive row-specific menu contents from the callback's typed `row/index/key` rather than assuming `context.document` already reflects the click. Command invocation occurs after selection is committed.

`selectRow(index)` provides the same guarded pointer-style selection for renderers that resolve their own row. It ignores out-of-range rows and modal-obscured input.

## Source coordinates and anchors

Source coordinates are zero-based. Offsets and columns are UTF-16 code-unit indices into the original, unnormalized source.

```ts
interface SourcePoint {
  offset: number;
  line: number;
  column: number;
}

interface SourceSpan {
  sourceId?: string;
  start: SourcePoint;
  end: SourcePoint;
  lastLine: number;
  text: string;
  lineText: string;
}
```

A `SourceSpan` is half-open: `[start, end)`. `lastLine` is the inclusive physical line actually touched, avoiding ambiguity when `end` is column zero on a following line. `text` is the exact source substring in the span; `lineText` contains the complete physical lines touched, excluding their outer newline delimiters and without newline normalization. `sourceId` is an optional opaque coordinate-space identifier such as a path, URI, or revision.

A row's provenance is:

```ts
interface DocumentRowSource {
  primary: SourceSpan;
  related?: readonly SourceSpan[];
}
```

`related` supports models such as diffs that relate more than one source. A generated row can have no source.

The controller wraps each valid row in `DocumentRowAnchor<T>`:

```ts
interface DocumentRowAnchor<T> {
  row: T;
  index: number;
  key: React.Key;
  text: string;
  source: DocumentRowSource | null;
}
```

Use:

- `controller.getAnchor(index)` for a typed arbitrary-row lookup;
- `controller.activeAnchor` for the cursor row;
- `controller.selectedAnchors` for toggled or range-selected rows, ordered by current row index.

These values are derived from the current rows and adapter, not a parallel mapping array. A valid generated row still has an anchor with `source: null`.

## Authoritative source row builders

### Markdown

```ts
const blocks = flattenMarkdown(markdown, { sourceId: "README.md" });
```

`flattenMarkdown(source, options?)` lexes, flattens, and maps Markdown in the exact navigation/render order. Each `FlatBlock` has `source: DocumentRowSource | null`. Use `getFlatBlockText(block)` for semantic search/copy text, including synthetic bullet rows:

```ts
const markdownAdapter: DocumentRowAdapter<FlatBlock> = {
  getText: getFlatBlockText,
  getSource: (block) => block.source,
};
```

Pass that same `blocks` array to `MarkdownView` via its `blocks` prop and the controller via `rows`. Re-lexing separately or reconstructing positions from marked tokens can drift, especially for repeated and nested blocks.

### Code and plain text

```ts
const rows = sourceLines(source, { sourceId: "src/index.ts" });
const controller = useDocumentController({ rows, adapter: sourceLineAdapter });
```

`sourceLines()` returns one `SourceLineRow` per physical line. Empty input produces one empty row; a trailing newline produces a final empty row. Line spans exclude LF/CRLF delimiters while offsets still address the original string. `sourceLineAdapter` supplies `getText` and `getSource`.

## Command context

`DocumentScreen` publishes a live, intentionally untyped snapshot at `ctx.document` for application actions:

- `kind`, `title`, and optional `reload` supplied through `DocumentScreen context`;
- `rowCount`, `cursor`, `activeKey`, `activeRow`;
- `selection`, `selectedRows`, `toggledIndices`;
- `activeAnchor`, `selectedAnchors`;
- optional values from `context.extras`.

For a comment, quote, or jump-to-source action, use:

```ts
const anchor = ctx.document?.activeAnchor;
const span = anchor?.source?.primary;
if (span) {
  console.log(span.sourceId, span.start.line, span.lastLine, span.lineText);
}
```

Command context uses `unknown` row values because commands are global and composable. Use the typed controller in component code and `ctx.document` as the bounded action snapshot. It intentionally does not publish `getAnchor()` or an all-row map.

## Imports

The controller, document components, adapter/controller types, and source coordinate/anchor types are exported from `@tooee/shell`. Pure row builders and renderer-specific row types are exported from `@tooee/renderers`:

```ts
import {
  Document,
  DocumentScreen,
  useDocumentController,
  type DocumentRowAdapter,
  type DocumentRowAnchor,
  type SourceSpan,
} from "@tooee/shell";
import {
  flattenMarkdown,
  getFlatBlockText,
  sourceLines,
  sourceLineAdapter,
  type FlatBlock,
} from "@tooee/renderers";
```
