# @tooee/view

Terminal content viewer for markdown, code, text, and tables.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

## Command context

A `View` screen publishes two command-context slices.

`ctx.document` is the generic row-document contract from `@tooee/shell`, owned by
the document controller: `rowCount`, `cursor`, `activeKey`, `activeRow`,
`selection`, `selectedRows` and `toggledIndices`. Every row document has it, so
row actions read the cursor from there:

```ts
handler: (ctx) => open(ctx.document?.activeRow);
```

`ctx.view` is content-only — what the viewer knows and the controller does not:

```ts
interface ViewCommandContext {
  content: AnyContent;
  format: string;
  title?: string;
  data?: unknown;
  reload: () => void;
  marks: {
    setMarkSet(set: MarkSet): void;
    clearNamespace(namespace: string): void;
    clearAll(): void;
    userMarks: MarkSet[];
    providerMarks: MarkSet[];
  };
}
```

## Headless view command context

Custom surfaces that behave like a view, but do not render the built-in `View`
component, can publish the `ctx.view` slice with `useProvideViewCommandContext`:

```tsx
import { useProvideViewCommandContext } from "@tooee/view";

useProvideViewCommandContext({
  format: "stream-dashboard",
  title: "Stream Dashboard",
  data: { rowCount: rows.length },
});
```

The hook fills safe defaults for headless surfaces: synthetic custom content,
empty marks, and a no-op reload. Row state comes from `useDocumentController`,
whose `DocumentScreen` provides `ctx.document` — do not synthesize it here.

For tests or non-React integrations, `createViewCommandContext({ ... })` creates
the same object shape directly.

## Custom renderers

A custom renderer receives the content and the host's document controller. Its
rows are the content's plain-text lines — the unit navigation, search and copy
work in.

```tsx
const KanbanRenderer: ContentRenderer = ({ content, document }) => (
  <box onMouseDown={() => document.selectRow(0)}>
    <text content={`cursor: ${document.activeIndex}`} />
  </box>
);
```

A renderer that owns a `<row-document>` binds the controller directly — it
satisfies `DocumentBindings`, the same `{ ref, decorations, onMouseDown }` the
built-in `CodeView`, `MarkdownView` and `Table` renderers take:

```tsx
<row-document
  ref={document.ref}
  decorations={document.decorations}
  onMouseDown={document.onMouseDown}
>
```

`selectRow` stands down while a modal overlay is open, so it can be wired
unconditionally.
