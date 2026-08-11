---
packages:
  "group:tooee": patch
---

## Ship the compiled `@tooee/diff` output

`@tooee/diff@0.7.0` reached npm without its `dist` build, so importing the package, or opening a
diff through `@tooee/view`, failed to resolve. This release republishes the package with the
compiled entry point in place. Install `0.7.1` or later for diff rendering.
