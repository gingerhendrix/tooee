---
packages:
  "@tooee/fuzzy": minor
  "@tooee/shell": minor
  "@tooee/themes": minor
---

## Share fuzzy ranking and move the theme picker to shell

`@tooee/fuzzy` now exports `rankBy`, which returns score-sorted matches with
source indices and matched character positions.

Theme picker integration now belongs to `@tooee/shell`. Import
`useThemePicker` and its public types from shell. `@tooee/themes` now contains
theme loading and context APIs without command or fuzzy dependencies.
