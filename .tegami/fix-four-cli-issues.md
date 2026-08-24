---
packages:
  "group:tooee": patch
---

## Restore expected CLI view and exit behavior

Standalone ask and choose sessions now exit on Ctrl+C. View keeps `q` available in error and empty-directory states, honors persisted diff layouts, and includes CSV, TSV, diff, and patch files in directory browsing.
