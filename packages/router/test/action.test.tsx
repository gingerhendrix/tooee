import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, describe, afterEach } from "bun:test"
import React, { act } from "react"
import {
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  useActionResultHandler,
} from "@tooee/router"
import type { ActionNavigationResult } from "@tooee/router"

// Screens

function HomeScreen() {
  return (
    <box>
      <text content="screen:home" />
    </box>
  )
}

function DetailScreen() {
  return (
    <box>
      <text content="screen:detail" />
    </box>
  )
}

// Route definitions

const homeRoute = createRoute({ id: "home", component: HomeScreen })
const detailRoute = createRoute({ id: "detail", component: DetailScreen })

// Test setup

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

describe("useActionResultHandler", () => {
  test("navigate result triggers router.push", async () => {
    let handler: (result: ActionNavigationResult) => void

    function HandlerCapture() {
      handler = useActionResultHandler()
      return null
    }

    const router = createRouter({
      routes: [homeRoute, detailRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
        <HandlerCapture />
      </RouterProvider>,
      { width: 80, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    let frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:home")

    await act(async () => {
      handler({ type: "navigate", route: "detail" })
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:detail")
    expect(router.stack.length).toBe(2)
  })

  test("navigate with mode replace triggers router.replace", async () => {
    let handler: (result: ActionNavigationResult) => void

    function HandlerCapture() {
      handler = useActionResultHandler()
      return null
    }

    const router = createRouter({
      routes: [homeRoute, detailRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
        <HandlerCapture />
      </RouterProvider>,
      { width: 80, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    await act(async () => {
      handler({ type: "navigate", route: "detail", mode: "replace" })
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:detail")
    // Replace should keep stack at 1 entry
    expect(router.stack.length).toBe(1)
  })

  test("navigate with params passes params to push", async () => {
    let handler: (result: ActionNavigationResult) => void

    function HandlerCapture() {
      handler = useActionResultHandler()
      return null
    }

    const router = createRouter({
      routes: [homeRoute, detailRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
        <HandlerCapture />
      </RouterProvider>,
      { width: 80, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    await act(async () => {
      handler({ type: "navigate", route: "detail", params: { id: "1" } })
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:detail")
    expect(router.currentRoute.params).toEqual({ id: "1" })
  })

  test("back result triggers router.pop", async () => {
    let handler: (result: ActionNavigationResult) => void

    function HandlerCapture() {
      handler = useActionResultHandler()
      return null
    }

    const router = createRouter({
      routes: [homeRoute, detailRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
        <HandlerCapture />
      </RouterProvider>,
      { width: 80, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // Push to detail first
    await act(async () => {
      router.push("detail")
    })
    await testSetup.renderOnce()

    let frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:detail")

    // Use handler to go back
    await act(async () => {
      handler({ type: "back" })
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).toContain("screen:home")
    expect(router.stack.length).toBe(1)
  })

  test("handler is stable across re-renders", async () => {
    const handlerRefs: Array<(result: ActionNavigationResult) => void> = []
    let forceUpdate: () => void

    function HandlerCapture() {
      const [, setState] = React.useState(0)
      forceUpdate = () => setState((n) => n + 1)
      const h = useActionResultHandler()
      handlerRefs.push(h)
      return null
    }

    const router = createRouter({
      routes: [homeRoute, detailRoute],
      defaultRoute: "home",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
        <HandlerCapture />
      </RouterProvider>,
      { width: 80, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // Force re-renders
    await act(async () => {
      forceUpdate()
    })
    await testSetup.renderOnce()

    await act(async () => {
      forceUpdate()
    })
    await testSetup.renderOnce()

    // Should have captured at least 3 renders
    expect(handlerRefs.length).toBeGreaterThanOrEqual(3)
    // All handler references should be the same function
    for (let i = 1; i < handlerRefs.length; i++) {
      expect(handlerRefs[i]).toBe(handlerRefs[0])
    }
  })
})
