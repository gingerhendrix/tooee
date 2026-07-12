#!/usr/bin/env bun
import { TooeeProvider } from "@tooee/shell";
import { View } from "@tooee/view";
import type { ContentProvider } from "@tooee/view";
import { FIXTURE_TIERS, makeTableFixture } from "./lib/fixtures.ts";
import {
  destroyRenderer,
  measureKeyPressLatencies,
  mountForInteraction,
  printLatencySummary,
  printMemoryMetrics,
} from "./lib/render.tsx";
import { printMetric } from "./lib/benchmark-result.ts";

const tier = FIXTURE_TIERS.large;
const interactionPresses = Number(process.env.TOOEE_BENCH_HEAVY_INTERACTIONS ?? 10);

if (!Number.isFinite(interactionPresses) || interactionPresses < 1) {
  throw new Error("TOOEE_BENCH_HEAVY_INTERACTIONS must be a positive number");
}

async function benchmarkViewContent(name: string, contentProvider: ContentProvider): Promise<void> {
  const setup = await mountForInteraction(
    <TooeeProvider initialMode="cursor" sequenceTimeoutMs={250}>
      <View contentProvider={contentProvider} />
    </TooeeProvider>,
  );

  try {
    const frame = setup.captureCharFrame();
    if (!frame.includes("Mode:") || !frame.includes("Cursor:")) {
      throw new Error(`${name} benchmark did not render the Tooee view chrome before interaction`);
    }

    const jLatencies = await measureKeyPressLatencies(setup, "j", interactionPresses);
    printLatencySummary(`${name}_j_key`, jLatencies);

    const halfPageLatencies = await measureKeyPressLatencies(setup, "d", interactionPresses, {
      ctrl: true,
    });
    printLatencySummary(`${name}_ctrl_d_key`, halfPageLatencies);
    printMemoryMetrics(`${name}_after_navigation`);
  } finally {
    await destroyRenderer(setup);
  }
}

const table = makeTableFixture(tier);
printMetric("table_large_row_count", table.rows.length);
printMetric("table_large_column_count", table.columns.length);

await benchmarkViewContent("table_large", {
  title: table.title,
  format: table.format,
  load: () => table,
});
