#!/usr/bin/env bun
import { View, type ContentProvider } from "@tooee/view";
import { TooeeProvider } from "@tooee/shell";
import {
  FIXTURE_TIERS,
  makeCodeFixture,
  makeMarkdownFixture,
  makeTableFixture,
} from "./lib/fixtures.ts";
import {
  destroyRenderer,
  measureKeyPressLatencies,
  mountForInteraction,
  printLatencySummary,
  printMemoryMetrics,
} from "./lib/render.tsx";

const tier = FIXTURE_TIERS.moderate;
const interactionPresses = Number(process.env.TOOEE_BENCH_INTERACTIONS ?? 30);

if (!Number.isFinite(interactionPresses) || interactionPresses < 1) {
  throw new Error("TOOEE_BENCH_INTERACTIONS must be a positive number");
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

const markdown = makeMarkdownFixture(tier);
const code = makeCodeFixture(tier);
const table = makeTableFixture(tier);

await benchmarkViewContent("markdown_moderate", {
  title: markdown.title,
  format: markdown.format,
  load: () => markdown,
});

await benchmarkViewContent("code_moderate", {
  title: code.title,
  format: code.format,
  load: () => code,
});

await benchmarkViewContent("table_moderate", {
  title: table.title,
  format: table.format,
  load: () => table,
});
