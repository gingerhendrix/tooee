import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach } from "bun:test";
import { act } from "react";
import { createRoute, createRouter, RouterProvider, Outlet, useRouteData } from "@tooee/router";

const ParamScreen = function ParamScreen(): React.ReactNode {
  const data = useRouteData<{ echo: string }>();
  return (
    <box>
      <text content={`screen:param:${data?.echo ?? "none"}`} />
    </box>
  );
};

// Helpers to control async loaders in tests

const createDeferred = function createDeferred<T>() {
  return Promise.withResolvers<T>();
};

// Screen components

const HomeScreen = function HomeScreen(): React.ReactNode {
  return (
    <box>
      <text content="screen:home" />
    </box>
  );
};

const DataScreen = function DataScreen(): React.ReactNode {
  const data = useRouteData<{ message: string }>();
  return (
    <box>
      <text content={`screen:data:${data?.message ?? "none"}`} />
    </box>
  );
};

const LoadingScreen = function LoadingScreen(): React.ReactNode {
  return (
    <box>
      <text content="screen:loading" />
    </box>
  );
};

const ErrorScreen = function ErrorScreen({ error }: { error: Error }): React.ReactNode {
  return (
    <box>
      <text content={`screen:error:${error.message}`} />
    </box>
  );
};

// Test setup

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("route loaders", () => {
  test("route with loader: pending then data", async () => {
    const deferred = createDeferred<{ message: string }>();

    const homeRoute = createRoute({ component: HomeScreen, id: "home" });
    const dataRoute = createRoute({
      component: DataScreen,
      id: "data",
      loader: async () => {
        const result = await deferred.promise;
        return result;
      },
      pendingComponent: LoadingScreen,
    });

    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, dataRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // Home renders initially
    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:home");

    // Navigate to data route — loader starts, pending shows
    await act(async () => {
      router.push("data");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:loading");
    expect(frame).not.toContain("screen:data");

    // Resolve the loader
    await act(async () => {
      deferred.resolve({ message: "hello" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:data:hello");
    expect(frame).not.toContain("screen:loading");
  });

  test("route without loader: renders immediately", async () => {
    const homeRoute = createRoute({ component: HomeScreen, id: "home" });

    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:home");
  });

  test("loader error with errorComponent: shows error", async () => {
    const deferred = createDeferred<unknown>();

    const homeRoute = createRoute({ component: HomeScreen, id: "home" });
    const errorRoute = createRoute({
      component: DataScreen,
      errorComponent: ErrorScreen,
      id: "failing",
      loader: async () => {
        const result = await deferred.promise;
        return result;
      },
      pendingComponent: LoadingScreen,
    });

    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, errorRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      router.push("failing");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    // Should show loading state
    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:loading");

    // Reject the loader
    await act(async () => {
      deferred.reject(new Error("load failed"));
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:error:load failed");
    expect(frame).not.toContain("screen:loading");
  });

  test("loader error without errorComponent: renders null", async () => {
    const deferred = createDeferred<unknown>();

    const homeRoute = createRoute({ component: HomeScreen, id: "home" });
    const errorRoute = createRoute({
      component: DataScreen,
      id: "failing",
      loader: async () => {
        const result = await deferred.promise;
        return result;
      },
      pendingComponent: LoadingScreen,
    });

    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, errorRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      router.push("failing");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:loading");

    // Reject
    await act(async () => {
      deferred.reject(new Error("boom"));
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).not.toContain("screen:loading");
    expect(frame).not.toContain("screen:data");
    expect(frame).not.toContain("screen:error");
  });

  test("useRouteData returns undefined for routes without loaders", async () => {
    let capturedData: unknown = "sentinel";

    const NoLoaderScreen = function NoLoaderScreen(): React.ReactNode {
      capturedData = useRouteData();
      return (
        <box>
          <text content="screen:noloader" />
        </box>
      );
    };

    const noLoaderRoute = createRoute({ component: NoLoaderScreen, id: "noloader" });

    const router = createRouter({
      defaultRoute: "noloader",
      routes: [noLoaderRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:noloader");
    expect(capturedData).toBeUndefined();
  });

  test("loader runs again on new push after pop", async () => {
    let loadCount = 0;

    const homeRoute = createRoute({ component: HomeScreen, id: "home" });
    const dataRoute = createRoute({
      component: DataScreen,
      id: "data",
      loader: async ({ params: _params }) => {
        loadCount += 1;
        await Promise.resolve();
        return { message: `load-${loadCount}` };
      },
    });

    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, dataRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // Push to data route — loader runs
    await act(async () => {
      router.push("data");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:data:load-1");
    expect(loadCount).toBe(1);

    // Pop back
    await act(async () => {
      router.pop();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:home");

    // Push again — loader should run again
    await act(async () => {
      router.push("data");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:data:load-2");
    expect(loadCount).toBe(2);
  });

  test("loader without pendingComponent renders null while loading", async () => {
    const deferred = createDeferred<{ message: string }>();

    const dataRoute = createRoute({
      component: DataScreen,
      id: "data",
      loader: async () => {
        const result = await deferred.promise;
        return result;
      },
      // No pendingComponent
    });

    const router = createRouter({
      defaultRoute: "data",
      routes: [dataRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // While loading, nothing should render (no pendingComponent)
    let frame = testSetup.captureCharFrame();
    expect(frame).not.toContain("screen:data");

    // Resolve
    await act(async () => {
      deferred.resolve({ message: "loaded" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:data:loaded");
  });

  test("loader race condition: stale result is discarded", async () => {
    const deferred1 = createDeferred<{ message: string }>();
    const deferred2 = createDeferred<{ message: string }>();
    let callCount = 0;

    const homeRoute = createRoute({ component: HomeScreen, id: "home" });
    const dataRoute = createRoute({
      component: DataScreen,
      id: "data",
      loader: async ({ params: _params }) => {
        callCount += 1;
        if (callCount === 1) {
          const result = await deferred1.promise;
          return result;
        }
        const result = await deferred2.promise;
        return result;
      },
      pendingComponent: LoadingScreen,
    });

    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, dataRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // Push to data route with first params — slow loader starts
    await act(async () => {
      router.push("data", { id: "1" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:loading");
    expect(callCount).toBe(1);

    // Before first loader resolves, push again with different params — second loader starts
    await act(async () => {
      router.push("data", { id: "2" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    expect(callCount).toBe(2);

    // Resolve the FIRST (stale) loader — its result should be discarded
    await act(async () => {
      deferred1.resolve({ message: "stale" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    // Should still be loading, not showing stale data
    expect(frame).not.toContain("screen:data:stale");

    // Resolve the second (current) loader
    await act(async () => {
      deferred2.resolve({ message: "current" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:data:current");
  });

  test("loader receives route params", async () => {
    let receivedParams: Record<string, unknown> = {};

    const homeRoute = createRoute({ component: HomeScreen, id: "home" });
    const paramRoute = createRoute({
      component: ParamScreen,
      id: "param",
      loader: async ({ params }) => {
        receivedParams = params;
        await Promise.resolve();
        return { echo: String(params.id) };
      },
    });

    const router = createRouter({
      defaultRoute: "home",
      routes: [homeRoute, paramRoute],
    });

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { height: 24, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      router.push("param", { id: "42" });
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("screen:param:42");
    expect(receivedParams).toEqual({ id: "42" });
  });
});
