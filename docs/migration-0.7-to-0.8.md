# Migrate from Tooee 0.7 to 0.8

Tooee 0.8 aligns the public contracts for application launches, chooser props,
and command contexts. The `tooee` CLI keeps the same visible behavior.

## Use launch results

All application launch functions now use the shell session lifecycle.

`@tooee/ask` returns the submitted text, or `null` when the session is
cancelled. It no longer writes to stdout or exits the process. A CLI host must
own those effects:

```ts
const value = await launchAsk({ prompt: "Search for:" });
if (value === null) process.exit(0);
process.stdout.write(`${value}\n`);
```

The optional `onSubmit` callback still runs before the Ask launch promise
resolves.

`@tooee/choose` continues to return `ChooseResult | null`. Its launch options
remain nested under `options` in 0.8.

`@tooee/view` now keeps its launch promise pending for the full renderer
session. It resolves with `void` after the session ends. Code that must run
while the viewer is open must run before it awaits `launch()`.

## Flatten Choose component props

Pass chooser display and selection options directly to `Choose`:

```tsx
// Before
<Choose
  contentProvider={provider}
  options={{ title: "Repository", prompt: "Filter", multi: true }}
  commands={actions}
/>

// After
<Choose
  contentProvider={provider}
  title="Repository"
  prompt="Filter"
  multi
  actions={actions}
/>
```

The `options` prop and the `commands` alias remain available for compatibility
in 0.8. They are deprecated and scheduled for removal in 0.9. Use `actions` as
the standard name for action definitions.

## Check command-context augmentations

Package and application fields added to `CommandContext` must be optional.
Only `mode`, `setMode`, `commands`, and `exit` are always present. Check an
augmented field before use:

```ts
handler: (ctx) => {
  const value = ctx.ask?.value;
  if (value === undefined) return;
  submit(value);
};
```

This rule matches runtime behavior. For example, a View-only surface does not
provide `ctx.ask`, and a surface outside the shell might not provide
`ctx.toast`.

## Prepare for 0.9

The top-level `leader`, `config`, `initialMode`, and `sequenceTimeoutMs` options
on `launchCli` remain available in 0.8. Move them under `provider` before 0.9:

```ts
await launchCli(node, {
  provider: { initialMode: "insert", leader: "space" },
});
```

The `tooee table` command also remains available in 0.8. Replace it with
`tooee view --renderer table` before 0.9.

## StreamOS follow-up

The read-only consumer scan at `repos/streamos/main` found six imports of the
Choose launch function. Those callers use the nested launch options that remain
supported. It found one Ask launch import. That wrapper can remove its manual
promise when it adopts the new `string | null` result.

The scan also found one unguarded `ctx.ask` read and five unguarded `ctx.view`
reads. Add presence checks when StreamOS upgrades to Tooee 0.8.
