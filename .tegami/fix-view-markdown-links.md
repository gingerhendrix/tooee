---
packages:
  "@tooee/view": patch
  "@tooee/cli": patch
---

## Follow local Markdown links in standalone view

Click a local Markdown link or press Enter on its source line in cursor mode to open the linked file in the same session. When the line holds several links, Enter opens a chooser listing them by text and destination. Use Backspace in cursor mode or Go back in the command palette to return. Fragments open at the file top; missing files, directories, and unsupported links show toasts. Launchers can register synchronous `linkHandlers` before the built-in local file handler. Links from stdin show an informational toast because navigation needs a source file.
