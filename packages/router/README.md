# @tooee/router

Stack-based routing, asynchronous navigation preparation, and screen-focus helpers for Tooee terminal apps.

## Creating and starting a router

Routes carry the parameter type used by application navigation. Parameter codecs validate every value that crosses the serialized boundary, and `canonicalize` can return a fresh canonical form before guards run.

```tsx
const detailRoute = createRoute({
  id: "detail",
  component: DetailScreen,
  params: detailParamsCodec,
  canonicalize: ({ id }) => ({ id: id.trim() }),
});

const router = createRouter({
  routes: [homeRoute, detailRoute],
  initial: { routeId: "home" },
  beforeNavigate: async (navigation) => {
    await prepareApplicationFor(navigation.target, navigation.signal);
  },
});

const startup = await router.start();
if (startup.status !== "committed") {
  // Do not mount RouterProvider.
  throw new Error(`Router startup ${startup.status}`);
}
```

`createRouter()` is initially unstarted and has an empty stack. `RouterProvider` requires a successfully started router; it no longer accepts an initial route or performs mount-time navigation. Concurrent startup calls share one attempt, successful startup is stable, and failed or cancelled startup can be retried.

## Navigation

Application code navigates with route objects, preserving the route's parameter type:

```ts
const result = await router.push(detailRoute, { id: "42" });

if (result.status === "committed") {
  // Router assignment and synchronous subscriber notification are complete.
}
```

`push`, `replace`, `reset`, `pop`, and `navigate` return `Promise<NavigationResult>`. Once work is submitted, these promises always resolve and never reject. Results are `committed`, `cancelled`, `noop`, or `failed`. A synchronous programmer error—such as using a foreign route object or navigating before startup—throws before a promise is returned.

Decoded commands and action results use the string-ID boundary:

```ts
await router.navigate({
  type: "replace",
  routeId: decoded.route,
  params: decoded.params,
});
```

Unknown serialized route IDs and invalid parameters resolve as `failed` and are reported to `onNavigationError`.

## Guards and cancellation

Guards run in registration order after the complete target is resolved, decoded, and canonicalized. This includes the entry revealed by `pop`. A guard may cancel, rewrite the target, or return resource handles:

```ts
const removeGuard = router.addNavigationGuard(async (navigation, context) => {
  const prepared = await context.prepare(navigation.target, navigation.signal);
  return {
    target: prepared.canonicalTarget,
    beforeCommit: prepared.activate,
    abort: prepared.dispose,
  };
});
```

Rewritten targets are decoded and canonicalized before the next guard. `beforeCommit` callbacks are synchronous and run in guard order. If work does not commit, `abort` callbacks run once in reverse order. Each activation callback must be internally atomic; the router cannot roll back arbitrary external effects.

Navigation is serialized switch-latest: a new call aborts active preparation, only the newest queued call is retained, and stale work cannot commit. Targets resolve against the committed stack when their turn begins.

## Commit and observability

The router does not change its stack or state cache until all preparation and activation succeeds. Cache invalidation happens immediately before the single stack assignment:

- push preserves existing cache entries;
- pop clears the removed top entry;
- replace clears the replaced top entry, including same-route replacement;
- reset clears all entries;
- failed, cancelled, and no-op navigation changes no cache state.

`pendingNavigation` identifies the active guard pipeline. `subscribeNavigation` emits `started` after pending is set and `settled` after it is cleared. Stack and navigation listeners are isolated per listener; errors go to `onSubscriberError` without changing a committed result.

A committed navigation means router assignment and synchronous listener iteration finished. Route loaders still begin during render, and React may not yet have committed. Loaders, `Outlet`, titles, focus, and screen-state behavior otherwise remain render-time concerns.

## Screen focus

`useScreenFocus()` combines two signals: the enclosing screen scope (for example, whether a containing panel is active) and whether the current route is the live leaf at its router depth. `useScreenEffect()` runs its effect only while that combined focus is true.

Outside both a router focus provider and an explicit screen scope, `useScreenFocus()` defaults to `{ isFocused: true }`. Inside a router, route-leaf focus behavior is unchanged; an inactive enclosing panel still forces focus to false.
