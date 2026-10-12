---
packages:
  "@tooee/view": minor
---

## Directory view moves file keys to `g n` and `g p`

In the directory view, `g n` opens the next file and `g p` opens the previous file. Before, these commands used `l` and `h`. The markdown and diff subviews also use `h` and `l` for horizontal scroll, so the command that registered first ran, and mount order decided which one that was. Now `h` and `l` only scroll.

To keep the old keys, set `"dir.next-file": "l"` and `"dir.prev-file": "h"` in the `keys` config.
