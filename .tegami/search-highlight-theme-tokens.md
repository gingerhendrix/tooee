---
packages:
  "@tooee/themes": minor
  "@tooee/shell": patch
---

## Add search highlight theme tokens

Themes have four new keys: `searchMatchBg`, `searchCurrentMatchBg`, `searchMatchFg`, and `searchCurrentMatchFg`. Every bundled theme sets them.

Search matches in row documents now use a background tinted from `warning`, and the current match uses a background tinted from `primary`. Before, both used the full `warning` and `primary` colours, which made the matched text hard to read. The gutter signs keep their old colours.

A custom theme that leaves out the new keys gets derived values: 22% of `warning` over `background` for `searchMatchBg`, 35% of `primary` over `background` for `searchCurrentMatchBg`, and `warning` and `primary` for the signs. Over a transparent `background`, the derived backgrounds are translucent.
