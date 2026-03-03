import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, describe, afterEach, beforeEach } from "bun:test"
import { act } from "react"
import {
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  useScreenFocus,
  useScreenEffect,
} from "@tooee/router"

// Simple screen that reports its focus state

function HomeScreen() {
  const { isFocused } = useScreenFocus()
  return (
    <box>
      <text content={`home:focused:${isFocused}`} />
    </box>
  )
}

// Nested layout that reports focus and renders child outlet

function FocusLayout() {
  const { isFocused } = useScreenFocus()
  return (
    <box>
      <text content={`layout:focused:${isFocused}`} />
      <Outlet />
    </box>
  )
}

function FocusChild() {
  const { isFocused } = useScreenFocus()
  return (
    <box>
      <text content={`child:focused:${isFocused}`} />
    </box>
  )
}

// Effect tracking components

let effectLog: string[] = []

function EffectLayout() {
  useScreenEffect(() => {
    effectLog.push("layout:effect")
    return () => {
      effectLog.push("layout:cleanup")
    }
  })
  const { isFocused } = useScreenFocus()
  return (
    <box>
      <text content={`elayout:focused:${isFocused}`} />
      <Outlet />
    </box>
  )
}

function EffectChild() {
  useScreenEffect(() => {
    effectLog.push("child:effect")
    return () => {
      effectLog.push("child:cleanup")
    }
  })
  return (
    <box>
      <text content="echild" />
    </box>
  )
}

// Route definitions

const homeRoute = createRoute({ id: "home", component: HomeScreen })
const layoutRoute = createRoute({ id: "layout", component: FocusLayout })
const nestedRoute = createRoute({
  id: "nested",
  parent: layoutRoute,
  component: FocusChild,
})

const effectLayoutRoute = createRoute({ id: "elayout", component: EffectLayout })
const effectNestedRoute = createRoute({
  id: "enested",
  parent: effectLayoutRoute,
  component: EffectChild,
})

// Test setup

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

beforeEach(() => {
  effectLog = []
})

describe("useScreenFocus", () => {
  test("returns isFocused true for top-of-stack screen", async () => {
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
    expect(frame).toContain("home:focused:true")
  })

  test("nested parent has isFocused false, leaf has isFocused true", async () => {
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
    expect(frame).toContain("layout:focused:false")
    expect(frame).toContain("child:focused:true")
  })

  test("focus updates when navigating from leaf to parent-only", async () => {
    const router = createRouter({
      routes: [layoutRoute, nestedRoute],
      defaultRoute: "layout",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // Layout alone is focused
    let frame = testSetup.captureCharFrame()
    expect(frame).toContain("layout:focused:true")

    // Push nested: layout loses focus, child gains it
    await act(async () => {
      router.push("nested")
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).toContain("layout:focused:false")
    expect(frame).toContain("child:focused:true")

    // Pop: layout regains focus
    await act(async () => {
      router.pop()
    })
    await testSetup.renderOnce()

    frame = testSetup.captureCharFrame()
    expect(frame).toContain("layout:focused:true")
  })
})

describe("useScreenEffect", () => {
  test("effect fires when screen is focused", async () => {
    const router = createRouter({
      routes: [effectLayoutRoute],
      defaultRoute: "elayout",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    expect(effectLog).toContain("layout:effect")
  })

  test("effect does not fire for unfocused parent", async () => {
    const router = createRouter({
      routes: [effectLayoutRoute, effectNestedRoute],
      defaultRoute: "enested",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // Only child effect should fire, not layout's
    expect(effectLog).toContain("child:effect")
    expect(effectLog).not.toContain("layout:effect")
  })

  test("cleanup fires when screen loses focus, re-fires on regain", async () => {
    const router = createRouter({
      routes: [effectLayoutRoute, effectNestedRoute],
      defaultRoute: "elayout",
    })

    testSetup = await testRender(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // Layout is focused, effect should have fired
    expect(effectLog).toEqual(["layout:effect"])

    // Push nested: layout loses focus
    await act(async () => {
      router.push("enested")
    })
    await testSetup.renderOnce()

    expect(effectLog).toContain("layout:cleanup")
    expect(effectLog).toContain("child:effect")

    // Clear log and pop: layout regains focus
    effectLog = []
    await act(async () => {
      router.pop()
    })
    await testSetup.renderOnce()

    expect(effectLog).toContain("layout:effect")
  })
})
