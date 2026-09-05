---
packages:
  "group:tooee": minor
---

## Align public application contracts

The Ask, Choose, View, shell, and command-context APIs now use consistent
public contracts. See [the 0.8 migration guide](../docs/migration-0.7-to-0.8.md).

### Migration

- Ask launch now returns `string | null`. The CLI host now owns stdout writes
  and process exit. Choose launch keeps its `ChooseResult | null` result, and
  View launch resolves with `void` when its session ends.
- `Choose` accepts `title`, `prompt`, `placeholder`, `multi`, and `emptyMessage`
  as top-level props. Its `options` prop remains as a deprecated alias for one
  release. Use `actions` instead of the deprecated `commands` alias.
- `CommandContext` augmentations such as `ask`, `choose`, `view`, `overlay`, and
  `toast` are optional. Check that a field is present before use.
- Deprecated top-level `launchCli` provider aliases and the `tooee table`
  command remain available until 0.9.0.
