---
packages:
  "@tooee/view": patch
  "@tooee/cli": patch
---

## Follow local Markdown links in standalone view

Click a local Markdown link or press Enter on its source line in cursor mode to open the linked file in the same session. Use Ctrl+O or Back to previous file in the command palette to return. Fragments open at the file top; directory links remain unhandled.
