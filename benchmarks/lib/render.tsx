import { performance } from "node:perf_hooks";
import type { ReactNode } from "react";
import { act } from "react";
import { testRender } from "../../test/support/test-render.ts";
import { percentile, printTimedMetric } from "./benchmark-result.ts";

export interface BenchmarkViewport {
  width: number;
  height: number;
}

export const DEFAULT_VIEWPORT: BenchmarkViewport = { height: 36, width: 140 };

export type TestRendererSetup = Awaited<ReturnType<typeof testRender>>;

export const renderPass = async function renderPass(
  setup: TestRendererSetup,
  passes = 1,
): Promise<void> {
  for (let pass = 0; pass < passes; pass += 1) {
    // Deferred(lint-sweep): preserve ordered render transitions; these passes intentionally run sequentially
    // oxlint-disable-next-line no-await-in-loop -- each render pass must complete before the next
    await act(async () => {
      await setup.renderOnce();
      await Bun.sleep(0);
    });
  }
};

export const destroyRenderer = async function destroyRenderer(
  setup: TestRendererSetup,
): Promise<void> {
  await act(async () => {
    setup.renderer.destroy();
    await Promise.resolve();
  });
};

export const measureFirstFrame = async function measureFirstFrame(
  metricPrefix: string,
  node: ReactNode,
  viewport: BenchmarkViewport = DEFAULT_VIEWPORT,
): Promise<string> {
  let setup: TestRendererSetup | undefined;
  const start = performance.now();
  try {
    setup = await testRender(node, { ...viewport, kittyKeyboard: true });
    await renderPass(setup);
    const duration = performance.now() - start;
    printTimedMetric(`${metricPrefix}_first_frame_ms`, duration);
    return setup.captureCharFrame();
  } finally {
    if (setup) {
      await destroyRenderer(setup);
    }
  }
};

export const mountForInteraction = async function mountForInteraction(
  node: ReactNode,
  viewport: BenchmarkViewport = DEFAULT_VIEWPORT,
): Promise<TestRendererSetup> {
  const setup = await testRender(node, { ...viewport, kittyKeyboard: true });
  await renderPass(setup, 3);
  return setup;
};

export const measureKeyPressLatencies = async function measureKeyPressLatencies(
  setup: TestRendererSetup,
  key: string,
  presses: number,
  modifiers?: { ctrl?: boolean; shift?: boolean },
): Promise<number[]> {
  const latencies: number[] = [];

  for (let press = 0; press < presses; press += 1) {
    const start = performance.now();
    // Deferred(lint-sweep): preserve ordered input/render transitions for latency measurements
    // oxlint-disable-next-line no-await-in-loop -- each key press is measured after its render
    await act(async () => {
      setup.mockInput.pressKey(key, modifiers);
      await setup.renderOnce();
      await Bun.sleep(0);
    });
    latencies.push(performance.now() - start);
  }

  return latencies;
};

export const printLatencySummary = function printLatencySummary(
  metricPrefix: string,
  latencies: number[],
): void {
  printTimedMetric(`${metricPrefix}_median_ms`, percentile(latencies, 50));
  printTimedMetric(`${metricPrefix}_p95_ms`, percentile(latencies, 95));
};

export const printMemoryMetrics = function printMemoryMetrics(metricPrefix: string): void {
  if (typeof Bun.gc === "function") {
    Bun.gc(true);
  }
  const usage = process.memoryUsage();
  console.log(`METRIC ${metricPrefix}_rss_bytes=${usage.rss}`);
  console.log(`METRIC ${metricPrefix}_heap_used_bytes=${usage.heapUsed}`);
};
