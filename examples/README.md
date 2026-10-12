# Examples

Each folder here is a private workspace package. Each package depends only on the Tooee packages that its examples import. No example package is published.

| Package | Folder | Shows |
| --- | --- | --- |
| `@tooee/example-ask` | [`ask/`](ask/) | The `@tooee/ask` prompt app. |
| `@tooee/example-choose` | [`choose/`](choose/) | `@tooee/choose` pickers: static lists, files, git branches, GitHub issues, and mouse input. |
| `@tooee/example-view` | [`view/`](view/) | `@tooee/view` documents: code, Markdown, diffs, Mermaid, outline, tables, git, GitHub, custom renderers and marks, mouse input, and toasts. The `assets/` folder and the `*-showcase.md` files hold the data for these examples. |
| `@tooee/example-shell` | [`shell/`](shell/) | `@tooee/shell` composition: overlay command surfaces, which-key groups, and a source-aware document. |
| `@tooee/example-panels` | [`panels/`](panels/) | `@tooee/panels`: full, controlled, custom-chrome, and disabled panel groups. |
| `@tooee/example-termcn` | [`termcn/`](termcn/) | A browser and live showcase for the termcn OpenTUI registry. Read [`termcn/README.md`](termcn/README.md) before you run it. |

## Run an example

Run an example from the repository root. Add `--conditions=@tooee/source` to use the package source without a build:

```bash
bun install
bun --conditions=@tooee/source examples/view/view-markdown.ts
```

`bun run check` typechecks every example package. When you add an example package, add a `tsc -p examples/<group>` step to the `check` script in the root `package.json`.
