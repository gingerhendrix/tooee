import { createTestRenderer } from "@opentui/core/testing";
import type { TestRendererOptions } from "@opentui/core/testing";
import { act } from "react";
import { createRoot } from "@opentui/react";

const setIsReactActEnvironment = function setIsReactActEnvironment(isReactActEnvironment: boolean) {
  // Deferred(lint-sweep): replace the global React test flag with a typed test-runtime API
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test renderer requires this undocumented global
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = isReactActEnvironment;
};

export const testRender = async function testRender(
  node: React.ReactNode,
  testRendererOptions: TestRendererOptions,
) {
  let root: ReturnType<typeof createRoot> | null = null;
  setIsReactActEnvironment(true);
  const testSetup = await createTestRenderer({
    ...testRendererOptions,
    onDestroy() {
      testRendererOptions.onDestroy?.();
      setIsReactActEnvironment(false);
    },
  });
  root = createRoot(testSetup.renderer);
  const render = (nextNode: React.ReactNode) => {
    root?.render(nextNode);
  };
  const rerender = async (nextNode: React.ReactNode) => {
    await act(async () => {
      render(nextNode);
      await Promise.resolve();
    });
  };
  await rerender(node);
  const originalDestroy = testSetup.renderer.destroy.bind(testSetup.renderer);
  testSetup.renderer.destroy = () => {
    act(() => {
      originalDestroy();
    });
  };
  return { ...testSetup, rerender };
};
