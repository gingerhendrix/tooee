import { describe, expect, test } from "bun:test";
import { createRoute, createRouter, createStateKey } from "@tooee/router";
import type {
  NavigationEvent,
  NavigationGuard,
  NavigationResult,
  ResolvedNavigation,
  RouteParams,
} from "@tooee/router";
import { idParams, valueState } from "./support/codecs.ts";

const Screen = function Screen(): null {
  return null;
};

const homeRoute = createRoute({ component: Screen, id: "home" });
const settingsRoute = createRoute({ component: Screen, id: "settings" });

const deferred = function deferred<T = undefined>(): PromiseWithResolvers<T> {
  return Promise.withResolvers<T>();
};

const expectStatus = function expectStatus<TStatus extends NavigationResult["status"]>(
  result: NavigationResult,
  status: TStatus,
): Extract<NavigationResult, { status: TStatus }> {
  expect(result.status).toBe(status);
  if (result.status !== status) {
    throw new Error(`Expected ${status}, got ${result.status}`);
  }
  // SAFETY: the equality guard above checks the same discriminant that selects
  // this Extract member from NavigationResult.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the checked status discriminant establishes the generic Extract member
  return result as Extract<NavigationResult, { status: TStatus }>;
};

describe("router startup", () => {
  test("uses the guarded pipeline and shares concurrent startup", async () => {
    const release = deferred();
    let calls = 0;
    const router = createRouter({
      beforeNavigate: async () => {
        calls += 1;
        await release.promise;
      },
      initial: { routeId: "home" },
      routes: [homeRoute],
    });

    const first = router.start();
    const second = router.start();
    expect(first).toBe(second);
    expect(router.started).toBe(false);
    expect(() => router.currentRoute).toThrow("has not started");
    expect(() => {
      void router.navigate({ routeId: "home", type: "push" });
    }).toThrow("has not started");

    release.resolve();
    const result = expectStatus(await first, "committed");
    expect(calls).toBe(1);
    expect(router.started).toBe(true);
    expect(router.currentRoute.routeId).toBe("home");
    expect(await router.start()).toBe(result);
  });

  test("failed and cancelled startup can retry", async () => {
    let attempt = 0;
    const errors: Error[] = [];
    const router = createRouter({
      // oxlint-disable-next-line typescript/consistent-return -- the third attempt intentionally allows navigation with an implicit void result
      beforeNavigate: () => {
        attempt += 1;
        if (attempt === 1) {
          throw new Error("prepare failed");
        }
        if (attempt === 2) {
          return false;
        }
      },
      initial: { routeId: "home" },
      onNavigationError: (error) => {
        errors.push(error);
      },
      routes: [homeRoute],
    });

    expectStatus(await router.start(), "failed");
    expect(router.started).toBe(false);
    await Promise.resolve();
    expectStatus(await router.start(), "cancelled");
    await Promise.resolve();
    expectStatus(await router.start(), "committed");
    expect(errors.map((error) => error.message)).toEqual(["prepare failed"]);
  });

  test("caller abort cancels startup and allows retry", async () => {
    const release = deferred();
    let wait = true;
    const router = createRouter({
      beforeNavigate: async () => {
        if (wait) {
          await release.promise;
        }
      },
      initial: { routeId: "home" },
      routes: [homeRoute],
    });
    const controller = new AbortController();
    const startup = router.start({ signal: controller.signal });
    controller.abort();
    release.resolve();
    expect(expectStatus(await startup, "cancelled").reason).toBe("aborted");
    wait = false;
    await Promise.resolve();
    expectStatus(await router.start(), "committed");
  });

  test("rejects duplicate route ids during construction", () => {
    const duplicate = createRoute({ component: Screen, id: "home" });
    expect(() =>
      createRouter({ initial: { routeId: "home" }, routes: [homeRoute, duplicate] }),
    ).toThrow('Duplicate route id "home"');
  });

  test("exposes the typed router context to guards", async () => {
    const runtime = { preparations: 0 };
    const router = createRouter({
      beforeNavigate: (_navigation, context) => {
        context.preparations += 1;
      },
      context: runtime,
      initial: { routeId: "home" },
      routes: [homeRoute],
    });

    await router.start();
    expect(router.context).toBe(runtime);
    expect(runtime.preparations).toBe(1);
  });
});

describe("target resolution and typed navigation", () => {
  test("decodes and canonicalizes before every guard, including rewrites", async () => {
    const canonicalDetail = createRoute({
      canonicalize: (params) => ({ id: params.id.trim() }),
      component: Screen,
      id: "canonical-detail",
      params: idParams,
    });
    const seen: string[] = [];
    const router = createRouter({
      beforeNavigate: [
        // oxlint-disable-next-line typescript/consistent-return -- only the matching target is rewritten
        (navigation) => {
          if (navigation.target?.routeId === "canonical-detail") {
            seen.push(String(navigation.target.params.id));
            return { target: { params: {}, routeId: "settings" } };
          }
        },
        (navigation) => {
          seen.push(navigation.target?.routeId ?? "none");
        },
      ],
      initial: { routeId: "home" },
      routes: [homeRoute, canonicalDetail, settingsRoute],
    });
    await router.start();

    expectStatus(await router.push(canonicalDetail, { id: " 42 " }), "committed");
    expect(seen).toEqual(["home", "42", "settings"]);
    expect(router.currentRoute).toEqual({ params: {}, routeId: "settings" });
  });

  test("serialized invalid targets fail without rejecting or changing state", async () => {
    const errors: Error[] = [];
    const router = createRouter({
      initial: { routeId: "home" },
      onNavigationError: (error) => {
        errors.push(error);
      },
      routes: [homeRoute],
    });
    await router.start();
    const before = router.stack;
    const result = await router.navigate({ routeId: "missing", type: "push" });
    expect(expectStatus(result, "failed").error.message).toContain("not found");
    expect(router.stack).toEqual(before);
    expect(errors).toHaveLength(1);
  });

  test("typed methods validate route identity synchronously", async () => {
    const router = createRouter({ initial: { routeId: "home" }, routes: [homeRoute] });
    await router.start();
    const foreign = createRoute({ component: Screen, id: "foreign" });
    expect(() => {
      void router.push(foreign);
    }).toThrow("not registered");
  });

  test("pop resolves and canonicalizes the revealed entry; bottom pop is a no-op", async () => {
    const initialParams: RouteParams = { tab: "UPPER" };
    const canonicalHome = createRoute({
      canonicalize: (params) => ({
        // This test owns the string fixture in initialParams and checks its canonical result below.
        // oxlint-disable-next-line anti-slop/no-runtime-typeof -- preserve the default branch while testing the open RouteParams contract
        tab: typeof params.tab === "string" ? params.tab.toLowerCase() : "default",
      }),
      component: Screen,
      id: "canonical-home",
    });
    const targets: Readonly<{ routeId: string; params: RouteParams }>[] = [];
    const router = createRouter({
      beforeNavigate: (navigation) => {
        if (navigation.intent.type === "pop" && navigation.target !== null) {
          targets.push(navigation.target);
        }
      },
      initial: { params: initialParams, routeId: "canonical-home" },
      routes: [canonicalHome, settingsRoute],
    });
    await router.start();
    await router.push(settingsRoute);
    expectStatus(await router.pop(), "committed");
    expect(targets).toEqual([{ params: { tab: "upper" }, routeId: "canonical-home" }]);
    expect(expectStatus(await router.pop(), "noop").reason).toBe("stack-bottom");
  });
});

describe("serialized switch-latest concurrency", () => {
  test("never overlaps guards and displaces all but the newest queued request", async () => {
    const releases: ReturnType<typeof deferred>[] = [];
    let running = 0;
    let maximum = 0;
    const router = createRouter({
      beforeNavigate: async (navigation) => {
        if (navigation.from.length === 0) {
          return;
        }
        running += 1;
        maximum = Math.max(maximum, running);
        const release = deferred();
        releases.push(release);
        await release.promise;
        running -= 1;
      },
      initial: { routeId: "home" },
      routes: [homeRoute, settingsRoute],
    });
    await router.start();

    const first = router.push(settingsRoute);
    const displaced = router.replace(homeRoute);
    const newest = router.reset(settingsRoute);
    expect(expectStatus(await displaced, "cancelled").reason).toBe("superseded");
    releases[0].resolve();
    expect(expectStatus(await first, "cancelled").reason).toBe("superseded");
    expect(releases).toHaveLength(2);
    releases[1].resolve();
    expectStatus(await newest, "committed");
    expect(maximum).toBe(1);
    expect(router.stack.map((entry) => entry.routeId)).toEqual(["settings"]);
  });

  test("caller abort and stale completion cannot commit", async () => {
    const release = deferred();
    const router = createRouter({
      beforeNavigate: async (navigation) => {
        if (navigation.intent.type !== "reset") {
          await release.promise;
        }
      },
      initial: { routeId: "home" },
      routes: [homeRoute, settingsRoute],
    });
    await router.start();
    const controller = new AbortController();
    const resultPromise = router.navigate(
      { routeId: "settings", type: "push" },
      { signal: controller.signal },
    );
    controller.abort();
    release.resolve();
    expect(expectStatus(await resultPromise, "cancelled").reason).toBe("aborted");
    expect(router.currentRoute.routeId).toBe("home");
  });
});

describe("activation, cleanup, cache, and errors", () => {
  test("activates in guard order and cleans up exactly once in reverse order", async () => {
    const log: string[] = [];
    const makeGuard =
      (id: string): NavigationGuard<undefined> =>
      () => ({
        abort: () => {
          log.push(`abort:${id}`);
        },
        beforeCommit: () => {
          log.push(`commit:${id}`);
        },
      });
    const router = createRouter({
      beforeNavigate: [
        makeGuard("a"),
        makeGuard("b"),
        // oxlint-disable-next-line typescript/consistent-return -- reset is allowed with an implicit void result
        (navigation) => {
          if (navigation.intent.type !== "reset") {
            return false;
          }
        },
      ],
      initial: { routeId: "home" },
      routes: [homeRoute, settingsRoute],
    });
    expectStatus(await router.start(), "committed");
    expect(log).toEqual(["commit:a", "commit:b"]);
    log.length = 0;
    expectStatus(await router.push(settingsRoute), "cancelled");
    expect(log).toEqual(["abort:b", "abort:a"]);
  });

  test("beforeCommit failure preserves router state and cache", async () => {
    let fail = false;
    const errors: string[] = [];
    const router = createRouter({
      beforeNavigate: () => ({
        abort: () => {},
        beforeCommit: () => {
          if (fail) {
            throw new Error("activation failed");
          }
        },
      }),
      initial: { routeId: "home" },
      onNavigationError: (error) => {
        errors.push(error.message);
      },
      routes: [homeRoute, settingsRoute],
    });
    await router.start();
    const key = createStateKey("0:home", valueState);
    router.stateCache.save(key, { value: "kept" });
    fail = true;
    expectStatus(await router.replace(settingsRoute), "failed");
    expect(router.currentRoute.routeId).toBe("home");
    expect(router.stateCache.restore(key)).toEqual({ value: "kept" });
    expect(errors).toEqual(["activation failed"]);
  });

  test("replace clears the old top cache key, including same-route replacement", async () => {
    const router = createRouter({ initial: { routeId: "home" }, routes: [homeRoute] });
    await router.start();
    const key = createStateKey("0:home", valueState);
    router.stateCache.save(key, { value: "old" });
    expectStatus(await router.replace(homeRoute), "committed");
    expect(router.stateCache.restore(key)).toBeUndefined();
  });

  test("subscriber and error-sink failures are isolated", async () => {
    let laterListenerCalls = 0;
    let subscriberErrors = 0;
    let fail = false;
    const router = createRouter({
      beforeNavigate: () => {
        if (fail) {
          throw new Error("guard failed");
        }
      },
      initial: { routeId: "home" },
      onNavigationError: () => {
        throw new Error("sink failed");
      },
      onSubscriberError: () => {
        subscriberErrors += 1;
        throw new Error("subscriber sink failed");
      },
      routes: [homeRoute, settingsRoute],
    });
    await router.start();
    router.subscribe(() => {
      throw new Error("listener failed");
    });
    router.subscribe(() => {
      laterListenerCalls += 1;
    });
    router.subscribeNavigation(() => {
      throw new Error("event listener failed");
    });

    expectStatus(await router.push(settingsRoute), "committed");
    expect(laterListenerCalls).toBe(1);
    fail = true;
    expectStatus(await router.reset(homeRoute), "failed");
    expect(subscriberErrors).toBeGreaterThan(0);
    expect(laterListenerCalls).toBe(1);
  });
});

describe("navigation observability", () => {
  test("sets pending before started and clears it before settled", async () => {
    const release = deferred();
    const events: { event: NavigationEvent["type"]; pending: number | null }[] = [];
    const router = createRouter({
      beforeNavigate: async (navigation) => {
        if (navigation.intent.type !== "reset") {
          await release.promise;
        }
      },
      initial: { routeId: "home" },
      routes: [homeRoute, settingsRoute],
    });
    await router.start();
    events.length = 0;
    router.subscribeNavigation((event) => {
      events.push({ event: event.type, pending: router.pendingNavigation?.id ?? null });
    });

    const navigation = router.push(settingsRoute);
    expect(router.pendingNavigation?.target?.routeId).toBe("settings");
    release.resolve();
    expectStatus(await navigation, "committed");
    expect(events).toEqual([
      { event: "started", pending: 2 },
      { event: "settled", pending: null },
    ]);
  });

  test("snapshots cannot mutate committed state", async () => {
    let captured: ResolvedNavigation | undefined;
    const router = createRouter({
      beforeNavigate: (navigation) => {
        captured = navigation;
      },
      initial: { routeId: "home" },
      routes: [homeRoute, settingsRoute],
    });
    await router.start();
    await router.push(settingsRoute);
    expect(() => {
      if (captured !== undefined && captured.next[0] !== undefined) {
        captured.next[0].params.changed = true;
      }
    }).toThrow();
    expect(router.stack.map((entry) => entry.routeId)).toEqual(["home", "settings"]);
  });
});
