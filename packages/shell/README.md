# @tooee/shell

Composition layer wiring Tooee apps together.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

## Session lifecycle

Use `mountTooee` when a host owns the renderer. Unmounting removes only the
React tree; it never destroys the renderer or installs local terminal-health
listeners.

```tsx
const mount = mountTooee(sshRenderer, <App />, {
  provider: { initialMode: "normal" },
});

mount.unmount();
```

Use `launchCli` for a locally owned renderer, or `runCliSession` when the UI
settles one result. Local handles own renderer destruction, terminal-health
listeners, and any `/dev/tty` streams opened by the input and output policies.

```tsx
const result = await runCliSession<string>(
  ({ resolve, cancel }) => <Prompt onSubmit={resolve} onCancel={cancel} />,
  {
    provider: { initialMode: "insert" },
    stdinPolicy: "tty-if-piped",
    stdoutPolicy: "tty-if-redirected",
  },
);
```

Repeated `unmount`, `destroy`, `resolve`, and `cancel` calls are safe. A session
returns `null` on cancellation. Initialization and render failures reject the
promise.
