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
