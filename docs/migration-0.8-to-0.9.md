# Migrate from Tooee 0.8 to 0.9

Tooee 0.9 removes the compatibility APIs deprecated in 0.8. Migrate to the
retained forms below before upgrading.

## Use direct Choose props and actions

`Choose` no longer accepts `options` or `commands`. Pass chooser options as
top-level props and action definitions through `actions`:

```tsx
// 0.8
<Choose contentProvider={provider} options={{ prompt: "Pick", multi: true }} commands={actions} />

// 0.9
<Choose contentProvider={provider} prompt="Pick" multi actions={actions} />
```

This change applies to the `Choose` component. The nested `options` field on
the `launch()` API and the `commands` field on lower-level chooser primitives
remain supported.

## Nest launchCli provider options

The top-level `leader`, `config`, `initialMode`, and `sequenceTimeoutMs`
aliases have been removed from `LaunchCliOptions`. Put them under `provider`:

```ts
await launchCli(node, {
  provider: {
    config,
    initialMode: "insert",
    leader: "space",
    sequenceTimeoutMs: 500,
  },
});
```

## Replace the table command

The `tooee table` alias has been removed. Select the table renderer through
the view command:

```sh
tooee view --renderer table data.csv
```

## Use the AppLayout scroll object

`AppLayout` no longer accepts `scrollRef` or `scrollProps`. Combine the ref and
its configuration in `scroll`:

```tsx
<AppLayout
  scroll={{ ref: scrollRef, focused: false, stickyScroll: true, stickyStart: "bottom" }}
  statusBar={{ items: [] }}
>
  {content}
</AppLayout>
```

## Use ColorMode from config

The `Mode` type alias from `@tooee/config` has been removed. Import
`ColorMode` instead:

```ts
import type { ColorMode } from "@tooee/config";
```

The command input mode type named `Mode` in `@tooee/commands` is a separate
API and remains supported.

## Use useSurfaceInvoke

The `useCommandContext` hook alias has been removed. Use
`useSurfaceInvoke()` to read the nearest command surface's commands and invoke
them:

```ts
const { commands, invoke } = useSurfaceInvoke();
```

## Use overlay handles and state hooks

Overlay controllers no longer expose `show`, `hide`, or `isOpen`.

- Replace `show(id, content, options)` with
  `open(id, () => content, undefined, options)`. If the old no-mode-change
  default matters, pass `{ mode: null }`.
- Keep the handle returned by `open()` and replace `hide(id)` with
  `handle.close()`.
- Replace `isOpen(id)` with `useOverlayState().stack.includes(id)`, or use
  `useHasOverlay()` when only the presence of any overlay matters.
- Use `handle.update(...)` for a known overlay, or the controller's retained
  `update(id, ...)` when updating by id is required. `closeTop()` remains
  available.
