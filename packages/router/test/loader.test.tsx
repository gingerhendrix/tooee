import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, describe, afterEach } from "bun:test"
import { act } from "react"
import {
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  useNavigate,
  useRouteData,
} from "@tooee/router"

// Helpers to control async loaders in tests

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// Screen components

function HomeScreen() {
  return (
    <box>
      <text content="screen:home" />
    </box>
  )
}

function DataScreen() {
  const data = useRouteData<{ message: string }>()
  return (
    <box>
      <text content={`screen:data:${data?.message ?? "none"}`} />
    </box>
  )
}

function LoadingScreen() {
  return (
    <box>
      <text content="screen:loading" />
    </box>
  )
}

function ErrorScreen({ error }: { error: Error }) {
  return (
    <box>
      <text content={`screen:error:${error.message}`} />
    </box>
  )
}

// Test setup

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

describe("route loaders", () => {
  test("route with loader: pending then data", async () => {
    const deferred = createDeferred<{ message: string }>()

    const homeRoute = createRoute({ id: "home", component: HomeScreen })
    const dataRoute = createRoute({
      id: "data",
      component: DataScreen,
      loader: () => deferred.promise,
      pendingComponent: LoadingScreen,
    })

    const router = createRouter({
      routes: [homeRoute, dataRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // Home renders initially
    let frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:home")

    // Navigate to data route — loader starts, pending shows
    await act(async () => {
      router.push("data")
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:loading")
    expect(frame).not.toContain("screen:data")

    // Resolve the loader
    await act(async () => {
      deferred.resolve({ message: "hello" })
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:data:hello")
    expect(frame).not.toContain("screen:loading")
  })

  test("route without loader: renders immediately", async () => {
    const homeRoute = createRoute({ id: "home", component: HomeScreen })

    const router = createRouter({
      routes: [homeRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:home")
  })

  test("loader error with errorComponent: shows error", async () => {
    const deferred = createDeferred<unknown>()

    const homeRoute = createRoute({ id: "home", component: HomeScreen })
    const errorRoute = createRoute({
      id: "failing",
      component: DataScreen,
      loader: () => deferred.promise,
      pendingComponent: LoadingScreen,
      errorComponent: ErrorScreen,
    })

    const router = createRouter({
      routes: [homeRoute, errorRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    await act(async () => {
      router.push("failing")
    })
    await testSetup.renderOnce()

    // Should show loading state
    let frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:loading")

    // Reject the loader
    await act(async () => {
      deferred.reject(new Error("load failed"))
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:error:load failed")
    expect(frame).not.toContain("screen:loading")
  })

  test("loader error without errorComponent: renders null", async () => {
    const deferred = createDeferred<unknown>()

    const homeRoute = createRoute({ id: "home", component: HomeScreen })
    const errorRoute = createRoute({
      id: "failing",
      component: DataScreen,
      loader: () => deferred.promise,
      pendingComponent: LoadingScreen,
    })

    const router = createRouter({
      routes: [homeRoute, errorRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    await act(async () => {
      router.push("failing")
    })
    await testSetup.renderOnce()

    let frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:loading")

    // Reject
    await act(async () => {
      deferred.reject(new Error("boom"))
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).not.toContain("screen:loading")
    expect(frame).not.toContain("screen:data")
    expect(frame).not.toContain("screen:error")
  })

  test("useRouteData returns undefined for routes without loaders", async () => {
    let capturedData: unknown = "sentinel"

    function NoLoaderScreen() {
      capturedData = useRouteData()
      return (
        <box>
          <text content="screen:noloader" />
        </box>
      )
    }

    const noLoaderRoute = createRoute({ id: "noloader", component: NoLoaderScreen })

    const router = createRouter({
      routes: [noLoaderRoute],
      defaultRoute: "noloader",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:noloader")
    expect(capturedData).toBeUndefined()
  })

  test("loader runs again on new push after pop", async () => {
    let loadCount = 0

    const homeRoute = createRoute({ id: "home", component: HomeScreen })
    const dataRoute = createRoute({
      id: "data",
      component: DataScreen,
      loader: async ({ params }) => {
        loadCount++
        return { message: `load-${loadCount}` }
      },
    })

    const router = createRouter({
      routes: [homeRoute, dataRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // Push to data route — loader runs
    await act(async () => {
      router.push("data")
    })
    await testSetup.renderOnce()

    let frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:data:load-1")
    expect(loadCount).toBe(1)

    // Pop back
    await act(async () => {
      router.pop()
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:home")

    // Push again — loader should run again
    await act(async () => {
      router.push("data")
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:data:load-2")
    expect(loadCount).toBe(2)
  })

  test("loader without pendingComponent renders null while loading", async () => {
    const deferred = createDeferred<{ message: string }>()

    const dataRoute = createRoute({
      id: "data",
      component: DataScreen,
      loader: () => deferred.promise,
      // No pendingComponent
    })

    const router = createRouter({
      routes: [dataRoute],
      defaultRoute: "data",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // While loading, nothing should render (no pendingComponent)
    let frame = testSetup.captureCharFrame()
    expect(frame).not.toContain("screen:data")

    // Resolve
    await act(async () => {
      deferred.resolve({ message: "loaded" })
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:data:loaded")
  })

  test("loader race condition: stale result is discarded", async () => {
    const deferred1 = createDeferred<{ message: string }>()
    const deferred2 = createDeferred<{ message: string }>()
    let callCount = 0

    const homeRoute = createRoute({ id: "home", component: HomeScreen })
    const dataRoute = createRoute({
      id: "data",
      component: DataScreen,
      loader: ({ params }) => {
        callCount++
        if (callCount === 1) return deferred1.promise
        return deferred2.promise
      },
      pendingComponent: LoadingScreen,
    })

    const router = createRouter({
      routes: [homeRoute, dataRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // Push to data route with first params — slow loader starts
    await act(async () => {
      router.push("data", { id: "1" })
    })
    await testSetup.renderOnce()

    let frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:loading")
    expect(callCount).toBe(1)

    // Before first loader resolves, push again with different params — second loader starts
    await act(async () => {
      router.push("data", { id: "2" })
    })
    await testSetup.renderOnce()
    expect(callCount).toBe(2)

    // Resolve the FIRST (stale) loader — its result should be discarded
    await act(async () => {
      deferred1.resolve({ message: "stale" })
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    // Should still be loading, not showing stale data
    expect(frame).not.toContain("screen:data:stale")

    // Resolve the second (current) loader
    await act(async () => {
      deferred2.resolve({ message: "current" })
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:data:current")
  })

  test("loader receives route params", async () => {
    let receivedParams: Record<string, unknown> = {}

    function ParamScreen() {
      const data = useRouteData<{ echo: string }>()
      return (
        <box>
          <text content={`screen:param:${data?.echo ?? "none"}`} />
        </box>
      )
    }

    const homeRoute = createRoute({ id: "home", component: HomeScreen })
    const paramRoute = createRoute({
      id: "param",
      component: ParamScreen,
      loader: async ({ params }) => {
        receivedParams = params
        return { echo: String(params.id) }
      },
    })

    const router = createRouter({
      routes: [homeRoute, paramRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    await act(async () => {
      router.push("param", { id: "42" })
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:param:42")
    expect(receivedParams).toEqual({ id: "42" })
  })
})
