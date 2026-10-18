# Releasing Tooee

Tooee uses [Tegami](https://tegami.fuma-nama.dev) to version and publish its public npm workspaces.

Every user-facing change should include a release note under `.tegami/`. Create one interactively with:

```bash
bun run tegami
```

Or add a file such as `.tegami/fix-overlay-focus.md`:

```md
---
packages:
  "@tooee/overlays": patch
---

## Prevent overlays from leaking keyboard input

Overlay keyboard events no longer reach the underlying app.
```

Use `patch`, `minor`, or `major` in the frontmatter. All public Tooee packages share a version, so a release note for any public package applies the same bump to the complete public workspace group. Target `"group:tooee"` when the note itself is relevant to every package.

After the change reaches `main`, the release workflow opens or updates the **Version Packages** pull request. Merging that pull request publishes through npm trusted publishing, creates the shared `v<version>` tag and GitHub release, and retains `.tegami/publish-lock.yaml` so a failed release can be retried by rerunning the workflow.

Do not edit package versions or create release tags by hand.

## New packages

npm trusted publishing can only be set up for a package that already exists on npm. Before the first Version Packages pull request that contains a new public package merges, create the package and its trusted publisher once from your own machine. `npm trust` needs npm 11.10.0 or newer, and your npm account needs two-factor authentication.

```bash
npm login
git fetch origin tegami/version-packages
git worktree add version-packages origin/tegami/version-packages
cd version-packages
bun install
bun run tegami npm pretrust --dry-run
bun run tegami npm pretrust
```

For each new package, `pretrust` publishes `0.0.0-tegami-trusted-publish-setup` under the `temp` dist-tag and runs `npm trust github <package> --repo gingerhendrix/tooee --file publish.yml`. It also writes `npm:mark-latest` entries into `.tegami/publish-lock.yaml`. Commit that change to the Version Packages branch and push it. Then merge the pull request.
