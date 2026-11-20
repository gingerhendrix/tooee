# @tooee/shell

Composition layer wiring Tooee apps together.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

## Which-key

`TooeeProvider` shows which-key hints whenever a bound sequence is waiting for its next key, including sequences outside the leader. At idle, `?` opens a passive list of the available single-key commands and sequence prefixes. Press a listed key to run the command or see the next steps. `Escape` closes the root hints. An applicable `?` binding, a pending sequence, insert mode, or a focused text editor takes precedence over opening root hints.

The root list reflects the active modal or panel, mode, and configured key remaps when it opens. The bar shortens long labels and shows a count when more keys are available than will fit. Apps composing the providers directly can set `<WhichKeyProvider leaderOnly>` to limit automatic hints to leader sequences when a leader is configured. `?` still opens the root list.

## Session lifecycle

Use `mountTooee` when a host owns the renderer. Unmounting removes only the React tree; it never destroys the renderer or installs local terminal-health listeners.

```tsx
const mount = mountTooee(sshRenderer, <App />, {
  provider: { initialMode: "normal" },
});

mount.unmount();
```

Use `launchCli` for a locally owned renderer, or `runCliSession` when the UI settles one result. Local handles own renderer destruction, terminal-health listeners, and any `/dev/tty` streams opened by the input and output policies.

```tsx
const result = await runCliSession<string>(
  ({ resolve, cancel }) => <Prompt onSubmit={resolve} onCancel={cancel} />,
  {
    provider: { initialMode: "insert" },
    stdinPolicy: "tty-if-piped",
    stdoutPolicy: "tty-if-redirected",
  }
);
```

Repeated `unmount`, `destroy`, `resolve`, and `cancel` calls are safe. A session returns `null` on cancellation. Initialization and render failures reject the promise.
