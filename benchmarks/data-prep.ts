#!/usr/bin/env bun
import { marked } from "marked";
import { computeColumnWidths, flattenTokens } from "@tooee/renderers";
import { FIXTURE_TIERS, makeMarkdownFixture, makeTableFixture } from "./lib/fixtures.ts";
import { printMetric, printTimedMetric } from "./lib/benchmark-result.ts";

const iterations = Number(process.env.TOOEE_BENCH_DATA_PREP_ITERATIONS ?? 20);
const maxWidth = Number(process.env.TOOEE_BENCH_TABLE_MAX_WIDTH ?? 120);

if (!Number.isFinite(iterations) || iterations < 1) {
  throw new Error("TOOEE_BENCH_DATA_PREP_ITERATIONS must be a positive number");
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function formatCellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function timeIterations(callback: () => number): { medianMs: number; lastCount: number } {
  const samples: number[] = [];
  let lastCount = 0;

  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    lastCount = callback();
    samples.push(performance.now() - started);
  }

  return { medianMs: median(samples), lastCount };
}

for (const tier of [FIXTURE_TIERS.moderate, FIXTURE_TIERS.large]) {
  const markdown = makeMarkdownFixture(tier);
  const table = makeTableFixture(tier);

  printMetric(`${tier.name}_iterations`, iterations);
  printMetric(`${tier.name}_markdown_char_count`, markdown.markdown.length);
  printMetric(`${tier.name}_table_row_count`, table.rows.length);
  printMetric(`${tier.name}_table_column_count`, table.columns.length);

  const lex = timeIterations(() => marked.lexer(markdown.markdown).length);
  printTimedMetric(`markdown_${tier.name}_lex_median`, lex.medianMs);
  printMetric(`markdown_${tier.name}_token_count`, lex.lastCount);

  const flatten = timeIterations(() => flattenTokens(marked.lexer(markdown.markdown)).length);
  printTimedMetric(`markdown_${tier.name}_lex_flatten_median`, flatten.medianMs);
  printMetric(`markdown_${tier.name}_flat_block_count`, flatten.lastCount);

  const normalize = timeIterations(() => {
    const normalizedRows = table.rows.map((row) =>
      table.columns.map((column) => formatCellValue(row[column.key])),
    );
    return normalizedRows.length * (normalizedRows[0]?.length ?? 0);
  });
  printTimedMetric(`table_${tier.name}_normalize_median`, normalize.medianMs);

  const width = timeIterations(() => {
    const headers = table.columns.map((column) => column.header ?? column.key);
    const normalizedRows = table.rows.map((row) =>
      table.columns.map((column) => formatCellValue(row[column.key])),
    );
    const widths = computeColumnWidths(headers, normalizedRows, maxWidth, {
      minColumnWidth: 4,
      maxColumnWidth: 80,
      sampleSize: 100,
      columnWidthMode: "content",
    });
    return widths.reduce((sum, value) => sum + value, 0);
  });
  printTimedMetric(`table_${tier.name}_normalize_width_median`, width.medianMs);
  printMetric(`table_${tier.name}_width_total`, width.lastCount);
}
