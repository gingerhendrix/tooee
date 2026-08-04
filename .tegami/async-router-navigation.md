---
packages:
  "@tooee/router": minor
---

## Add guarded asynchronous router navigation

Router startup and later navigation now share one asynchronous, switch-latest preparation pipeline. Navigation uses typed route objects in application code, returns non-rejecting result promises, supports target canonicalization and resource guards, and isolates cache and subscriber failures at the commit boundary.
