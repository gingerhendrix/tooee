---
packages:
  "@tooee/ask": minor
  "@tooee/choose": minor
---

## Enter always calls `onSubmit` and `onConfirm`

Before, an action with the id `submit` took the place of the `onSubmit` callback in `Ask` and the `onConfirm` callback in `Choose`. Enter ran the action and skipped the callback, so `launch()` from `@tooee/ask` and `@tooee/choose` resolved `null` when a caller passed a `submit` action.

Now Enter always calls the callback, and `launch()` returns the value. An action with the id `submit` is an ordinary command. It runs from the command palette or from its own hotkey. `AskOverlay`, `ChooseOverlay` and the dialog hooks already worked this way.

If your app used a `submit` action to read the value, move that code into `onSubmit` or `onConfirm`.
