---
packages:
  "@tooee/themes": patch
---

## The nearest project theme folder wins

Tooee loads `.tooee/themes/` folders from the filesystem root down to the current folder. When two folders have a theme with the same name, the theme in the folder nearest to the current folder is used. Before, the parent folder's theme replaced the child's. Config files already used nearest wins.
