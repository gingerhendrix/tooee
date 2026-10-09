# termcn browser and showcase

A Tooee example that browses the [termcn](https://www.termcn.dev/) OpenTUI component registry and runs the real termcn demos in a preview panel.

```bash
bun --conditions=@tooee/source examples/termcn/main.tsx
```

## Layers

- **Browser.** Reads `https://www.termcn.dev/r/registry.json` and lists the OpenTUI UI components by category, with a fuzzy filter. The detail panel shows the description, dependencies, the `npx shadcn@latest add @termcn/opentui/<name>` command (press `y` to copy it), the docs page, and the highlighted source. Fetches are cached in `~/.cache/tooee-termcn` for 24 hours. `$TOOEE_TERMCN_CACHE` or `$XDG_CACHE_HOME` moves the cache. When the network fails, the app uses an expired cached copy if one exists.
- **Live showcase.** The Preview tab (`1`) opens first and mounts termcn's own demos from `vendor/`. Press `n` and `p` to cycle the demos, `Enter` to send keys to the demo, and `Ctrl+G` to give the keys back to Tooee. The demos use the colours of the active Tooee theme.

## Vendored termcn source

The live layer needs termcn's source on disk. Sync it once:

```bash
bun examples/termcn/scripts/sync-vendor.ts                 # clones the pinned commit
bun examples/termcn/scripts/sync-vendor.ts --source <dir>  # or copies from a local checkout
```

The script copies `apps/web/registry/bases/opentui`, `apps/web/examples/opentui`, and the files they import (a few shared Ink hooks and `constants/site.ts`) into `vendor/`. It rewrites the `@/` aliases to relative paths, replaces the `ink` and `@/registry/bases` imports with small shims, and keeps termcn's MIT `LICENSE` and a `VENDORED.json` record of the commit. The pinned commit is `TERMCN_COMMIT` in `sync/vendor-files.ts`.

`vendor/` is git-ignored, so the Tooee repository does not carry third-party source. `examples/tsconfig.json` excludes it, and lint skips it because git ignores it. To commit it instead, remove `/vendor/` from `.gitignore` and add `examples/termcn/vendor/**` to `ignorePatterns` in `oxlint.config.ts`.

After a sync, check which demos render:

```bash
bun --conditions=@tooee/source examples/termcn/scripts/check-demos.tsx
```
