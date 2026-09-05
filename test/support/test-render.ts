import { createTestRenderer } from "@opentui/core/testing";
import type { TestRendererOptions } from "@opentui/core/testing";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "@opentui/react";

const setIsReactActEnvironment = function setIsReactActEnvironment(isReactActEnvironment: boolean) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = isReactActEnvironment;
};

export const testRender = async function testRender(
  node: ReactNode,
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
  const render = (nextNode: ReactNode) => {
    root?.render(nextNode);
  };
  const rerender = async (nextNode: ReactNode) => {
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
