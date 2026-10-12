---
packages:
  "@tooee/clipboard": minor
  "@tooee/shell": patch
  "@tooee/ask": patch
---

## Copy tells you when no clipboard tool is installed

`copyToClipboard` now resolves `true` when a clipboard tool took the text, and `false` when no tool is installed or the tool exits with an error. Before, it resolved nothing, and the copy commands always showed "Copied".

The copy commands in `@tooee/shell` and the Ask editor now show an error toast when the copy fails. On Linux, install `wl-copy`, `xclip` or `xsel`.
