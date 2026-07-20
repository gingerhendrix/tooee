# @tooee/router

Stack-based routing and screen-focus helpers for Tooee terminal apps.

## Screen focus

`useScreenFocus()` combines two signals: the enclosing screen scope (for
example, whether a containing panel is active) and whether the current route is
the live leaf at its router depth. `useScreenEffect()` runs its effect only while
that combined focus is true.

Compatibility note: `useScreenFocus()` now intentionally defaults to
`{ isFocused: true }` when it is called outside both a router focus provider and
an explicit screen scope. Previously, the missing-router-provider default was
false. This makes non-router content live by default and lets an enclosing panel
scope gate it without requiring the router to know about panels. Inside a router,
route-leaf focus behavior is unchanged; inside an inactive panel, the panel scope
still forces focus to false.
