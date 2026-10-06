# Vendored anti-slop Oxlint plugin

This directory vendors Dillon Mulroy's `anti-slop` plugin under the MIT license.

- Canonical source: `repos/oxlint-rules`, folder `plugins/anti-slop/`
- Upstream: `https://github.com/dmmulroy/anti-slop`
- Upstream commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (2026-09-10, after v0.1.2)
- Vendored commit and file hashes: [`VENDORED.json`](VENDORED.json)
- Local policy: Tooee repository-owned configuration in `/oxlint.config.ts`
- Third-party code inside the copy: `vendor/eslint-stylistic/` holds the ESLint Stylistic padding
  engine under its own MIT license. See its `UPSTREAM.md`.

Do not edit these files here. Change the rule in `oxlint-rules`, then run
`bun run vendor anti-slop <tooee-worktree>` from that repository. Tooee owns rule severity and
scoping in `/oxlint.config.ts`.

The Tooee rule `no-react-global-namespace` moved to the `react-idioms` plugin in
`tools/oxlint/react-idioms/`. Its rule id is now `react-idioms/no-react-global-namespace`.
