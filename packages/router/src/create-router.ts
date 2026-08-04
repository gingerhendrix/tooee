import { StateCache } from "./state-cache.js";
import type {
  AnyRoute,
  NavigationEvent,
  NavigationFailureContext,
  NavigationGuard,
  NavigationGuardResult,
  NavigationResult,
  ResolvedNavigation,
  RouteDefinition,
  RouteParams,
  RouterInstance,
  RouterOptions,
  SerializedNavigationIntent,
  StackEntry,
} from "./types.js";

/* oxlint-disable typescript/promise-function-async -- public navigation wrappers intentionally preserve synchronous pre-submission throws */

interface GuardHandle {
  beforeCommit?: () => void;
  abort?: () => void;
  aborted: boolean;
}

interface Request {
  readonly id: number;
  readonly intent: SerializedNavigationIntent;
  readonly controller: AbortController;
  readonly callerSignal?: AbortSignal;
  readonly startup: boolean;
  readonly promise: Promise<NavigationResult>;
  resolve: (result: NavigationResult) => void;
  removeCallerAbort?: () => void;
  navigation?: ResolvedNavigation;
  cancellation?: "superseded" | "aborted";
  settled: boolean;
}

const asError = function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
};

const cloneEntry = function cloneEntry(entry: Readonly<StackEntry>): StackEntry {
  return { params: { ...entry.params }, routeId: entry.routeId };
};

const cloneIntent = function cloneIntent(
  intent: SerializedNavigationIntent,
): SerializedNavigationIntent {
  if (intent.type === "pop") {
    return Object.freeze({ type: "pop" });
  }
  return Object.freeze({
    params: intent.params === undefined ? undefined : Object.freeze({ ...intent.params }),
    routeId: intent.routeId,
    type: intent.type,
  });
};

const snapshotStack = function snapshotStack(
  stack: readonly Readonly<StackEntry>[],
): readonly Readonly<StackEntry>[] {
  return Object.freeze(
    stack.map((entry) =>
      Object.freeze({ params: Object.freeze({ ...entry.params }), routeId: entry.routeId }),
    ),
  );
};

const cancellationResult = function cancellationResult(request: Request): NavigationResult {
  return {
    id: request.id,
    reason: request.cancellation ?? "aborted",
    status: "cancelled",
  };
};

export const createRouter = function createRouter<TContext = undefined>(
  options: RouterOptions<TContext>,
): RouterInstance<TContext> {
  const routeMap = new Map<string, AnyRoute>();
  for (const route of options.routes) {
    if (routeMap.has(route.id)) {
      throw new Error(`Duplicate route id "${route.id}"`);
    }
    routeMap.set(route.id, route);
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- omitted context is exactly TContext's undefined default; non-default contexts are supplied by inference
  const context = options.context as TContext;
  const initialGuards: NavigationGuard<TContext>[] = [];
  const configuredGuards = options.beforeNavigate;
  if (configuredGuards !== undefined) {
    if (typeof configuredGuards === "function") {
      initialGuards.push(configuredGuards);
    } else {
      for (const guard of configuredGuards) {
        initialGuards.push(guard);
      }
    }
  }
  const guards = new Set<NavigationGuard<TContext>>(initialGuards);
  const listeners = new Set<() => void>();
  const navigationListeners = new Set<(event: NavigationEvent) => void>();
  const stateCache = new StateCache();
  let stack: StackEntry[] = [];
  let started = false;
  let nextId = 1;
  let active: Request | null = null;
  let queued: Request | null = null;
  let pendingNavigation: ResolvedNavigation | null = null;
  let startupPromise: Promise<NavigationResult> | null = null;
  let startupResult: NavigationResult | null = null;

  const reportNavigationError = function reportNavigationError(
    error: Error,
    failureContext: NavigationFailureContext,
  ): void {
    try {
      options.onNavigationError?.(error, failureContext);
    } catch {
      // Error sinks are deliberately isolated.
    }
  };

  const reportSubscriberError = function reportSubscriberError(error: unknown): void {
    try {
      options.onSubscriberError?.(asError(error));
    } catch {
      // Error sinks are deliberately isolated.
    }
  };

  const emitNavigation = function emitNavigation(event: NavigationEvent): void {
    for (const listener of navigationListeners) {
      try {
        listener(event);
      } catch (error) {
        reportSubscriberError(error);
      }
    }
  };

  const cleanupHandles = function cleanupHandles(request: Request, handles: GuardHandle[]): void {
    for (const handle of handles.toReversed()) {
      if (handle.abort === undefined || handle.aborted) {
        continue;
      }
      handle.aborted = true;
      try {
        handle.abort();
      } catch (error) {
        reportNavigationError(asError(error), {
          id: request.id,
          intent: request.intent,
          navigation: request.navigation,
        });
      }
    }
  };

  const createRequest = function createRequest(
    intent: SerializedNavigationIntent,
    callerSignal: AbortSignal | undefined,
    startup: boolean,
  ): Request {
    const { promise, resolve } = Promise.withResolvers<NavigationResult>();
    const id = nextId;
    nextId += 1;
    return {
      callerSignal,
      controller: new AbortController(),
      id,
      intent: cloneIntent(intent),
      promise,
      resolve,
      settled: false,
      startup,
    };
  };

  const resolveTarget = function resolveTarget(entry: StackEntry): StackEntry {
    const route = routeMap.get(entry.routeId);
    if (route === undefined) {
      throw new Error(`Route "${entry.routeId}" not found`);
    }
    return { params: route.resolveParams(entry.params), routeId: route.id };
  };

  const nextFor = function nextFor(
    intent: SerializedNavigationIntent,
    from: readonly Readonly<StackEntry>[],
    target: StackEntry,
  ): StackEntry[] {
    switch (intent.type) {
      case "push": {
        return [...from.map(cloneEntry), cloneEntry(target)];
      }
      case "replace": {
        return [...from.slice(0, -1).map(cloneEntry), cloneEntry(target)];
      }
      case "reset": {
        return [cloneEntry(target)];
      }
      case "pop": {
        return [...from.slice(0, -2).map(cloneEntry), cloneEntry(target)];
      }
      default: {
        throw new Error("Unsupported navigation intent");
      }
    }
  };

  const navigationFor = function navigationFor(
    request: Request,
    from: readonly Readonly<StackEntry>[],
    target: StackEntry,
  ): ResolvedNavigation {
    const detachedTarget = Object.freeze({
      params: Object.freeze({ ...target.params }),
      routeId: target.routeId,
    });
    return Object.freeze({
      from,
      id: request.id,
      intent: request.intent,
      next: snapshotStack(nextFor(request.intent, from, target)),
      signal: request.controller.signal,
      target: detachedTarget,
    });
  };

  const finish = function finish(request: Request, result: NavigationResult): void {
    if (request.settled) {
      return;
    }
    request.settled = true;
    request.removeCallerAbort?.();
    if (pendingNavigation?.id === request.id) {
      pendingNavigation = null;
    }
    if (request.navigation !== undefined) {
      emitNavigation({ navigation: request.navigation, result, type: "settled" });
    }
    request.resolve(result);
    if (active === request) {
      active = null;
      const next = queued;
      queued = null;
      if (next !== null) {
        // oxlint-disable-next-line no-use-before-define -- finish and startRequest are mutually recursive state-machine transitions
        startRequest(next);
      }
    }
  };

  const fail = function fail(request: Request, error: unknown, handles: GuardHandle[]): void {
    const normalized = asError(error);
    cleanupHandles(request, handles);
    reportNavigationError(normalized, {
      id: request.id,
      intent: request.intent,
      navigation: request.navigation,
    });
    finish(request, { error: normalized, id: request.id, status: "failed" });
  };

  const commit = function commit(request: Request, handles: GuardHandle[]): void {
    if (request.controller.signal.aborted) {
      cleanupHandles(request, handles);
      finish(request, cancellationResult(request));
      return;
    }
    try {
      for (const handle of handles) {
        handle.beforeCommit?.();
      }
    } catch (error) {
      fail(request, error, handles);
      return;
    }
    if (request.controller.signal.aborted) {
      cleanupHandles(request, handles);
      finish(request, cancellationResult(request));
      return;
    }

    const { navigation } = request;
    if (navigation === undefined) {
      fail(request, new Error("Navigation target was not resolved"), handles);
      return;
    }
    const previous = stack;
    switch (request.intent.type) {
      case "pop": {
        const index = previous.length - 1;
        const removed = previous[index];
        if (removed !== undefined) {
          stateCache.clear(`${index}:${removed.routeId}`);
        }
        break;
      }
      case "replace": {
        const index = previous.length - 1;
        const removed = previous[index];
        if (removed !== undefined) {
          stateCache.clear(`${index}:${removed.routeId}`);
        }
        break;
      }
      case "reset": {
        stateCache.clearAll();
        break;
      }
      case "push": {
        break;
      }
      default: {
        throw new Error("Unsupported navigation intent");
      }
    }
    stack = navigation.next.map(cloneEntry);
    if (request.startup) {
      started = true;
    }
    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        reportSubscriberError(error);
      }
    }
    const result: NavigationResult = {
      from: navigation.from,
      id: request.id,
      status: "committed",
      to: snapshotStack(stack),
    };
    if (request.startup) {
      startupResult = result;
    }
    finish(request, result);
  };

  const runGuards = function runGuards(
    request: Request,
    guardList: readonly NavigationGuard<TContext>[],
    index: number,
    handles: GuardHandle[],
  ): void {
    if (request.controller.signal.aborted) {
      cleanupHandles(request, handles);
      finish(request, cancellationResult(request));
      return;
    }
    if (index >= guardList.length) {
      commit(request, handles);
      return;
    }
    const { navigation } = request;
    if (navigation === undefined) {
      fail(request, new Error("Navigation target was not resolved"), handles);
      return;
    }

    let output: NavigationGuardResult | Promise<NavigationGuardResult>;
    try {
      output = guardList[index](navigation, context);
    } catch (error) {
      fail(request, error, handles);
      return;
    }

    const continueWith = function continueWith(result: NavigationGuardResult): void {
      if (request.controller.signal.aborted) {
        cleanupHandles(request, handles);
        finish(request, cancellationResult(request));
        return;
      }
      if (result === false) {
        cleanupHandles(request, handles);
        finish(request, { id: request.id, reason: "guard", status: "cancelled" });
        return;
      }
      if (result !== undefined) {
        handles.push({ abort: result.abort, aborted: false, beforeCommit: result.beforeCommit });
        if (result.target !== undefined) {
          try {
            const target = resolveTarget(result.target);
            request.navigation = navigationFor(request, navigation.from, target);
            pendingNavigation = request.navigation;
          } catch (error) {
            fail(request, error, handles);
            return;
          }
        }
      }
      runGuards(request, guardList, index + 1, handles);
    };

    if (output instanceof Promise) {
      // oxlint-disable-next-line promise/prefer-await-to-callbacks, promise/prefer-await-to-then -- chaining preserves synchronous commits for synchronous guards
      void output.then(continueWith, (error: unknown) => {
        fail(request, error, handles);
      });
    } else {
      continueWith(output);
    }
  };

  const startRequest = function startRequest(request: Request): void {
    if (request.settled) {
      return;
    }
    active = request;
    if (request.callerSignal?.aborted === true) {
      request.cancellation = "aborted";
      request.controller.abort();
      finish(request, cancellationResult(request));
      return;
    }

    const from = snapshotStack(stack);
    let rawTarget: StackEntry;
    if (request.intent.type === "pop") {
      if (from.length <= 1) {
        finish(request, { id: request.id, reason: "stack-bottom", status: "noop" });
        return;
      }
      const revealed = from.at(-2);
      if (revealed === undefined) {
        finish(request, { id: request.id, reason: "stack-bottom", status: "noop" });
        return;
      }
      rawTarget = cloneEntry(revealed);
    } else {
      rawTarget = { params: request.intent.params ?? {}, routeId: request.intent.routeId };
    }

    try {
      const target = resolveTarget(rawTarget);
      request.navigation = navigationFor(request, from, target);
    } catch (error) {
      fail(request, error, []);
      return;
    }
    pendingNavigation = request.navigation;
    emitNavigation({ navigation: request.navigation, type: "started" });
    runGuards(request, [...guards], 0, []);
  };

  const submit = function submit(
    intent: SerializedNavigationIntent,
    callerSignal?: AbortSignal,
    startup = false,
  ): Promise<NavigationResult> {
    const request = createRequest(intent, callerSignal, startup);
    if (callerSignal !== undefined) {
      const onAbort = function onAbort(): void {
        request.cancellation ??= "aborted";
        request.controller.abort();
        if (queued === request) {
          queued = null;
          finish(request, cancellationResult(request));
        }
      };
      callerSignal.addEventListener("abort", onAbort, { once: true });
      request.removeCallerAbort = () => {
        callerSignal.removeEventListener("abort", onAbort);
      };
    }

    if (active === null) {
      startRequest(request);
    } else {
      active.cancellation ??= "superseded";
      active.controller.abort();
      if (queued !== null) {
        const displaced = queued;
        queued = null;
        displaced.cancellation = "superseded";
        displaced.controller.abort();
        finish(displaced, cancellationResult(displaced));
      }
      queued = request;
    }
    return request.promise;
  };

  const assertStarted = function assertStarted(): void {
    if (!started) {
      throw new Error("Router has not started. Await router.start() before navigating.");
    }
  };

  const typedIntent = function typedIntent<TParams extends RouteParams>(
    type: "push" | "replace" | "reset",
    route: RouteDefinition<TParams>,
    params: TParams | undefined,
  ): Promise<NavigationResult> {
    assertStarted();
    if (routeMap.get(route.id) !== route) {
      throw new Error(`Route object "${route.id}" is not registered with this router`);
    }
    return submit({ params: params ?? {}, routeId: route.id, type });
  };

  /* oxlint-disable sort-keys -- the instance follows the documented public API grouping */
  const instance: RouterInstance<TContext> = {
    addNavigationGuard(guard) {
      guards.add(guard);
      return () => {
        guards.delete(guard);
      };
    },
    canGoBack() {
      return stack.length > 1;
    },
    get context() {
      return context;
    },
    get currentRoute() {
      assertStarted();
      const current = stack.at(-1);
      if (current === undefined) {
        throw new Error("Router stack is empty");
      }
      return current;
    },
    getRouteDefinition(routeId) {
      return routeMap.get(routeId);
    },
    navigate(intent, navigationOptions) {
      assertStarted();
      return submit(intent, navigationOptions?.signal);
    },
    get pendingNavigation() {
      return pendingNavigation;
    },
    pop(navigationOptions) {
      assertStarted();
      return submit({ type: "pop" }, navigationOptions?.signal);
    },
    push(route, ...params) {
      return typedIntent("push", route, params[0]);
    },
    replace(route, ...params) {
      return typedIntent("replace", route, params[0]);
    },
    reset(route, ...params) {
      return typedIntent("reset", route, params[0]);
    },
    start(startOptions) {
      if (startupResult?.status === "committed") {
        return Promise.resolve(startupResult);
      }
      if (startupPromise !== null) {
        return startupPromise;
      }
      const promise = submit(
        { params: options.initial.params, routeId: options.initial.routeId, type: "reset" },
        startOptions?.signal,
        true,
      );
      startupPromise = promise;
      void (async () => {
        const result = await promise;
        if (result.status !== "committed") {
          startupPromise = null;
        }
      })();
      return promise;
    },
    get stack() {
      return stack;
    },
    get started() {
      return started;
    },
    get stateCache() {
      return stateCache;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    subscribeNavigation(listener) {
      navigationListeners.add(listener);
      return () => {
        navigationListeners.delete(listener);
      };
    },
  };
  /* oxlint-enable sort-keys */

  return instance;
};

/* oxlint-enable typescript/promise-function-async */
