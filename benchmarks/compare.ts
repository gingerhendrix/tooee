#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import type {
  BenchmarkMetricResult,
  BenchmarkRunResult,
  BenchmarkUnit,
} from "./lib/benchmark-result.ts";

interface CompareOptions {
  baselinePath: string;
  candidatePath: string;
  failOnRegression: boolean;
  onlyComparable: boolean;
}

interface MetricComparison {
  name: string;
  unit: BenchmarkUnit;
  baseline: BenchmarkMetricResult;
  candidate: BenchmarkMetricResult;
  delta: number;
  ratio: number;
  percent: number;
  thresholdExceeded: boolean;
}

function printHelp(): void {
  console.log(`Usage: bun run bench:compare -- BASELINE.json CANDIDATE.json [options]

Compares aggregated benchmark JSON files produced by \`bun run bench -- --out\`.
Lower comparable metrics are treated as better.

Options:
  --fail-on-regression   Exit non-zero if any comparable metric exceeds its threshold
  --all                  Include non-comparable/count metrics in the table
  -h, --help             Show this help
`);
}

function parseArgs(args: string[]): CompareOptions {
  const positional: string[] = [];
  let failOnRegression = false;
  let onlyComparable = true;

  for (const arg of args) {
    if (arg === "--fail-on-regression") {
      failOnRegression = true;
    } else if (arg === "--all") {
      onlyComparable = false;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown benchmark compare argument: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 2) {
    printHelp();
    throw new Error("Expected exactly two JSON result paths");
  }

  return {
    baselinePath: positional[0]!,
    candidatePath: positional[1]!,
    failOnRegression,
    onlyComparable,
  };
}

function readRun(path: string): BenchmarkRunResult {
  const parsed = JSON.parse(readFileSync(path, "utf-8")) as BenchmarkRunResult;
  if (parsed.version !== 1 || !Array.isArray(parsed.results)) {
    throw new Error(`${path} is not a supported Tooee benchmark result file`);
  }
  return parsed;
}

function formatValue(value: number, unit: BenchmarkUnit): string {
  if (unit === "bytes") {
    return `${formatBytes(value)}`;
  }
  if (unit === "ms") {
    return `${value >= 100 ? value.toFixed(1) : value.toFixed(2)}ms`;
  }
  if (unit === "ratio") {
    return value.toFixed(3);
  }
  if (unit === "boolean") {
    return value === 0 ? "false" : "true";
  }
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
}

function formatBytes(value: number): string {
  const units = ["B", "KiB", "MiB", "GiB"];
  let next = value;
  let unit = 0;
  while (Math.abs(next) >= 1024 && unit < units.length - 1) {
    next /= 1024;
    unit += 1;
  }
  return `${next >= 100 ? next.toFixed(1) : next.toFixed(2)} ${units[unit]}`;
}

function formatDelta(value: number, unit: BenchmarkUnit): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatValue(value, unit)}`;
}

function compareRuns(
  baseline: BenchmarkRunResult,
  candidate: BenchmarkRunResult,
  onlyComparable: boolean,
): MetricComparison[] {
  const candidateByName = new Map(candidate.results.map((result) => [result.name, result]));
  const comparisons: MetricComparison[] = [];

  for (const baselineMetric of baseline.results) {
    if (onlyComparable && !baselineMetric.comparable) {
      continue;
    }

    const candidateMetric = candidateByName.get(baselineMetric.name);
    if (!candidateMetric) {
      continue;
    }

    const delta = candidateMetric.median - baselineMetric.median;
    const ratio =
      baselineMetric.median === 0
        ? candidateMetric.median === 0
          ? 1
          : Infinity
        : candidateMetric.median / baselineMetric.median;
    const percent = baselineMetric.median === 0 ? 0 : (ratio - 1) * 100;
    const threshold = baselineMetric.threshold;
    const thresholdExceeded = Boolean(
      baselineMetric.comparable &&
      threshold &&
      delta > threshold.minAbsoluteRegression &&
      ratio > threshold.maxRegressionRatio,
    );

    comparisons.push({
      name: baselineMetric.name,
      unit: baselineMetric.unit,
      baseline: baselineMetric,
      candidate: candidateMetric,
      delta,
      ratio,
      percent,
      thresholdExceeded,
    });
  }

  return comparisons.sort((left, right) => {
    if (left.thresholdExceeded !== right.thresholdExceeded) {
      return left.thresholdExceeded ? -1 : 1;
    }
    return right.percent - left.percent;
  });
}

function printRunHeader(label: string, path: string, run: BenchmarkRunResult): void {
  console.log(`${label}: ${path}`);
  console.log(
    `  sha=${run.gitSha ?? "unknown"} generated=${run.generatedAt} samples=${run.samplesPerBenchmark}`,
  );
  console.log(`  scripts=${run.scripts.join(", ")}`);
}

function printComparisons(comparisons: MetricComparison[]): void {
  console.log("\n| Metric | Baseline | Candidate | Delta | Change | Status |");
  console.log("|---|---:|---:|---:|---:|---|");
  for (const comparison of comparisons) {
    const status = comparison.thresholdExceeded
      ? "REGRESSION"
      : comparison.delta < 0
        ? "better"
        : "ok";
    console.log(
      `| ${comparison.name} | ${formatValue(comparison.baseline.median, comparison.unit)} | ${formatValue(comparison.candidate.median, comparison.unit)} | ${formatDelta(comparison.delta, comparison.unit)} | ${comparison.percent >= 0 ? "+" : ""}${comparison.percent.toFixed(1)}% | ${status} |`,
    );
  }
}

const options = parseArgs(Bun.argv.slice(2));
const baseline = readRun(options.baselinePath);
const candidate = readRun(options.candidatePath);
const comparisons = compareRuns(baseline, candidate, options.onlyComparable);
const regressions = comparisons.filter((comparison) => comparison.thresholdExceeded);

printRunHeader("Baseline", options.baselinePath, baseline);
printRunHeader("Candidate", options.candidatePath, candidate);
printComparisons(comparisons);
console.log(
  `\nCompared ${comparisons.length} metric(s); ${regressions.length} threshold regression(s).`,
);

if (options.failOnRegression && regressions.length > 0) {
  process.exitCode = 1;
}
