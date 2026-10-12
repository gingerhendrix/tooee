---
packages:
  "@tooee/themes": minor
---

## `useThemeSwitcher` can change light or dark mode

`useThemeSwitcher()` returns a new `setMode(mode, { persist })` function. It switches the current theme between its light and dark variants while the app runs. With `persist: true`, it also writes the mode to the global config, as `setTheme` does.
