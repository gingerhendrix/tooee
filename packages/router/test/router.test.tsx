import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, describe, afterEach } from "bun:test"
import { act } from "react"
import {
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  useNavigate,
  useParams,
  useCurrentRoute,
  useCanGoBack,
} from "@tooee/router"

// Route components

function HomeScreen() {
  return (
    <box>
      <text content="screen:home" />
    </box>
  )
}

function DetailScreen() {
  const params = useParams<{ id: string }>()
  return (
    <box>
      <text content={`screen:detail:${params.id ?? "none"}`} />
    </box>
  )
}

function SettingsScreen() {
  return (
    <box>
      <text content="screen:settings" />
    </box>
  )
}

// Parent/child for nested outlet tests

function LayoutScreen() {
  return (
    <box>
      <text content="layout:" />
      <Outlet />
    </box>
  )
}

function NestedChild() {
  return (
    <box>
      <text content="nested-child" />
    </box>
  )
}

// Route definitions

const homeRoute = createRoute({ id: "home", component: HomeScreen })
const detailRoute = createRoute({ id: "detail", component: DetailScreen })
const settingsRoute = createRoute({ id: "settings", component: SettingsScreen })

const layoutRoute = createRoute({ id: "layout", component: LayoutScreen })
const nestedRoute = createRoute({
  id: "nested",
  parent: layoutRoute,
  component: NestedChild,
})

// Test harness that exposes navigation controls via rendered text

function NavHarness({
  router,
}: {
  router: ReturnType<typeof createRouter>
}) {
  const nav = useNavigate()
  const current = useCurrentRoute()
  const canGoBack = useCanGoBack()

  return (
    <box>
      <text content={`route:${current.routeId}`} />
      <text content={`back:${canGoBack}`} />
      <Outlet />
    </box>
  )
}

// Test setup

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

describe("RouterProvider + Outlet", () => {
  test("renders default route", async () => {
    const router = createRouter({
      routes: [homeRoute, detailRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <NavHarness router={router} />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("route:home")
    expect(frame).toContain("screen:home")
    expect(frame).toContain("back:false")
  })

  test("push navigates to new route", async () => {
    const router = createRouter({
      routes: [homeRoute, detailRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <NavHarness router={router} />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    await act(async () => {
      router.push("detail", { id: "42" })
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("route:detail")
    expect(frame).toContain("screen:detail:42")
    expect(frame).toContain("back:true")
  })

  test("pop returns to previous route", async () => {
    const router = createRouter({
      routes: [homeRoute, detailRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <NavHarness router={router} />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    await act(async () => {
      router.push("detail", { id: "1" })
    })
    await testSetup.renderOnce()

    await act(async () => {
      router.pop()
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("route:home")
    expect(frame).toContain("screen:home")
    expect(frame).toContain("back:false")
  })

  test("replace swaps current route", async () => {
    const router = createRouter({
      routes: [homeRoute, detailRoute, settingsRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <NavHarness router={router} />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    await act(async () => {
      router.replace("settings")
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("route:settings")
    expect(frame).toContain("screen:settings")
    expect(frame).toContain("back:false")
  })

  test("reset clears stack", async () => {
    const router = createRouter({
      routes: [homeRoute, detailRoute, settingsRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <NavHarness router={router} />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    await act(async () => {
      router.push("detail", { id: "1" })
    })
    await act(async () => {
      router.push("settings")
    })
    await testSetup.renderOnce()
    expect(testSetup.captureCharFrame()).toContain("back:true")

    await act(async () => {
      router.reset("home")
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("route:home")
    expect(frame).toContain("back:false")
  })

  test("nested outlet renders parent chain", async () => {
    const router = createRouter({
      routes: [homeRoute, layoutRoute, nestedRoute],
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
      router.push("nested")
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("layout:")
    expect(frame).toContain("nested-child")
  })
})

describe("createRouter (imperative)", () => {
  test("works outside React", () => {
    const router = createRouter({
      routes: [homeRoute, detailRoute],
      defaultRoute: "home",
    })

    expect(router.currentRoute.routeId).toBe("home")
    expect(router.canGoBack()).toBe(false)

    router.push("detail", { id: "5" })
    expect(router.currentRoute.routeId).toBe("detail")
    expect(router.currentRoute.params).toEqual({ id: "5" })
    expect(router.canGoBack()).toBe(true)

    router.pop()
    expect(router.currentRoute.routeId).toBe("home")
    expect(router.canGoBack()).toBe(false)
  })

  test("subscribe notifies on changes", () => {
    const router = createRouter({
      routes: [homeRoute, detailRoute],
      defaultRoute: "home",
    })

    let callCount = 0
    const unsub = router.subscribe(() => {
      callCount++
    })

    router.push("detail")
    expect(callCount).toBe(1)

    router.pop()
    expect(callCount).toBe(2)

    // pop at bottom is no-op, should not notify
    router.pop()
    expect(callCount).toBe(2)

    unsub()
    router.push("detail")
    expect(callCount).toBe(2) // unsubscribed
  })

  test("getRouteDefinition returns route or undefined", () => {
    const router = createRouter({
      routes: [homeRoute, detailRoute],
      defaultRoute: "home",
    })

    expect(router.getRouteDefinition("home")).toBe(homeRoute)
    expect(router.getRouteDefinition("nonexistent")).toBeUndefined()
  })
})
