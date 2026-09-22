---
packages:
  "group:tooee": patch
---

## Update OpenTUI to 0.5.12 and refresh dependencies

Tooee now builds and tests against OpenTUI 0.5.12. The `@opentui/core` and `@opentui/react` peer ranges move from `^0.5.1` to `^0.5.12`, so apps that embed Tooee packages should install OpenTUI 0.5.12 or later.

`@tooee/diff` now uses `hunkdiff` 0.22.0. Its OpenTUI peers accept the new runtime, so installs no longer warn about `hunkdiff` peers. `@tooee/diff` also installs `@pierre/diffs` 1.3.5, which the Hunk OpenTUI components need at runtime.

Markdown parsing moves to `marked` 18. Heading rows in the Markdown view now search and copy as the heading line alone, without trailing blank lines. Chooser rows keep a blank column before the scrollbar under the new OpenTUI text wrapping.

React 19.3 and `@xstate/store` 4.2.3 are the new tested versions.
