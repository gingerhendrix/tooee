import { createTestRenderer, type TestRendererOptions } from "@opentui/core/testing"
import { act } from "react"
import { createRoot } from "@opentui/react"

function setIsReactActEnvironment(isReactActEnvironment: boolean) {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = isReactActEnvironment
}

export async function testRender(
  node: React.ReactNode,
  testRendererOptions: TestRendererOptions,
) {
  let root: ReturnType<typeof createRoot> | null = null
  setIsReactActEnvironment(true)
  const testSetup = await createTestRenderer({
    ...testRendererOptions,
    onDestroy() {
      testRendererOptions.onDestroy?.()
      setIsReactActEnvironment(false)
    },
  })
  root = createRoot(testSetup.renderer)
  await act(async () => {
    if (root) {
      root.render(node)
    }
  })
  const originalDestroy = testSetup.renderer.destroy.bind(testSetup.renderer)
  testSetup.renderer.destroy = () => {
    act(() => {
      originalDestroy()
    })
  }
  return testSetup
}
