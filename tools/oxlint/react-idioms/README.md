# Vendored react-idioms Oxlint plugin

This directory vendors the `react-idioms` plugin from `repos/oxlint-rules`, folder
`plugins/react-idioms/`. The rule tests live in that repository.

- Vendored commit and file hashes: [`VENDORED.json`](VENDORED.json)
- Local policy: Tooee repository-owned configuration in `/oxlint.config.ts`

Rules:

- `no-react-global-namespace` requires an explicit `React` import binding before code uses a
  `React.X` type. Prefer a named type import such as `import type { ReactNode } from "react"`.

Do not edit these files here. Change the rule in `oxlint-rules`, then run
`bun run vendor react-idioms <tooee-worktree>` from that repository.
