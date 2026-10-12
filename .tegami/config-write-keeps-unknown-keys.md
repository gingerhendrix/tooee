---
packages:
  "@tooee/config": patch
---

## `writeGlobalConfig` keeps keys it does not know

`writeGlobalConfig` used to decode the global config file, merge the update, and write the decoded result back. Any key that Tooee does not decode, for example `"editor"`, went away. Now the write merges into the raw JSON document. Unknown keys stay, at the top level and inside `theme`, `keys` and `view`.

If the global config file is not valid JSON, the write now leaves it unchanged. Before, the write replaced the file.
