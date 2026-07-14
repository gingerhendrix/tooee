#!/usr/bin/env bun
import os from "node:os";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { aggregateMetric } from "./lib/benchmark-result.ts";
import type { BenchmarkRunResult } from "./lib/benchmark-result.ts";

const DEFAULT_SCRIPTS = ["render-first-frame.tsx", "interaction-latency.tsx"];
const HEAVY_SCRIPTS = ["heavy-render.tsx", "heavy-interaction.tsx"];

interface RunOptions {
  samples: number;
  out?: string;
  includeHeavy: boolean;
  scripts: string[];
}

const readArgValue = function readArgValue(args: string[], index: number): string {
  const value = args[index + 1];
  if (!value) {
    throw new Error(`Missing value for ${args[index]}`);
  }
  return value;
};

const printHelp = function printHelp(): void {
  console.log(`Usage: bun run bench -- [options]

Options:
  --samples N        Repeat each benchmark script N times (default: 3)
  --out PATH         Write aggregated JSON to PATH
  --script FILE      Run one script under benchmarks/; repeatable
  --include-heavy    Include opt-in large fixture benchmarks
  -h, --help         Show this help
`);
};

const parseArgs = function parseArgs(args: string[]): RunOptions {
  const options: RunOptions = {
    includeHeavy: process.env.TOOEE_BENCH_INCLUDE_HEAVY === "1",
    samples: Number(process.env.TOOEE_BENCH_SAMPLES ?? 3),
    scripts: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--samples") {
      options.samples = Number(readArgValue(args, index));
      index += 1;
      continue;
    }

    if (arg === "--out") {
      options.out = readArgValue(args, index);
      index += 1;
      continue;
    }

    if (arg === "--include-heavy") {
      options.includeHeavy = true;
      continue;
    }

    if (arg === "--script") {
      options.scripts.push(readArgValue(args, index));
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown benchmark runner argument: ${arg}`);
  }

  if (!Number.isFinite(options.samples) || options.samples < 1) {
    throw new Error("--samples must be a positive number");
  }

  options.samples = Math.floor(options.samples);
  return options;
};

const parseMetrics = function parseMetrics(output: string): Map<string, number> {
  const metrics = new Map<string, number>();
  const metricPattern = /^METRIC\s+(?<metric>[A-Za-z0-9_.:-]+)=(?<value>-?\d+(?:\.\d+)?)$/u;

  for (const line of output.split(/\r?\n/u)) {
    const match = metricPattern.exec(line.trim());
    if (match) {
      const metric = match.groups?.metric;
      const value = match.groups?.value;
      if (metric === undefined || value === undefined) {
        throw new Error(`Invalid metric line: ${line}`);
      }
      metrics.set(metric, Number(value));
    }
  }

  return metrics;
};

const runScript = async function runScript(script: string): Promise<Map<string, number>> {
  const proc = Bun.spawn(["bun", "--conditions=@tooee/source", `benchmarks/${script}`], {
    env: { ...process.env, CI: process.env.CI ?? "1" },
    stderr: "pipe",
    stdin: "ignore",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (stderr.trim()) {
    console.warn(stderr.trim());
  }

  if (exitCode !== 0) {
    throw new Error(`${script} failed with exit code ${exitCode}\n${stderr}`);
  }

  process.stdout.write(stdout);
  return parseMetrics(stdout);
};

const gitSha = function gitSha(): string | undefined {
  const proc = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
    stderr: "ignore",
    stdin: "ignore",
    stdout: "pipe",
  });
  if (proc.exitCode !== 0) {
    return undefined;
  }
  return Buffer.from(proc.stdout).toString("utf-8").trim();
};

const packageInfo = async function packageInfo(): Promise<{ name?: string; version?: string }> {
  try {
    // Deferred(lint-sweep): add schema-based validation for package metadata JSON
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- package metadata validation is deferred
    const packageJson = JSON.parse(await Bun.file("package.json").text()) as {
      name?: string;
      version?: string;
    };
    return { name: packageJson.name, version: packageJson.version };
  } catch {
    return {};
  }
};

const formatValue = function formatValue(value: number, unit: string): string {
  if (unit === "bytes") {
    return `${Math.round(value).toLocaleString()} bytes`;
  }
  if (unit === "ms") {
    return `${value >= 100 ? value.toFixed(1) : value.toFixed(2)}ms`;
  }
  return value.toFixed(2);
};

const options = parseArgs(Bun.argv.slice(2));
const scripts = options.scripts.length > 0 ? [...options.scripts] : [...DEFAULT_SCRIPTS];
if (options.includeHeavy) {
  scripts.push(...HEAVY_SCRIPTS);
}

const samplesByMetric = new Map<string, { source: string; metric: string; samples: number[] }>();

for (const script of scripts) {
  const source = script.replace(/\.[^.]+$/u, "");
  console.log(`\n## ${source}`);

  for (let sample = 1; sample <= options.samples; sample += 1) {
    console.log(`\n# sample ${sample}/${options.samples}`);
    // Deferred(lint-sweep): preserve ordered benchmark execution and output aggregation
    // oxlint-disable-next-line no-await-in-loop -- samples must run sequentially
    const metrics = await runScript(script);

    for (const [metric, value] of metrics) {
      const key = `${source}/${metric}`;
      const entry = samplesByMetric.get(key) ?? { metric, samples: [], source };
      entry.samples.push(value);
      samplesByMetric.set(key, entry);
    }
  }
}

const results = [...samplesByMetric.values()]
  .map(({ source, metric, samples }) => aggregateMetric(source, metric, samples))
  .toSorted((left, right) => left.name.localeCompare(right.name));
const packageJson = await packageInfo();

const runResult: BenchmarkRunResult = {
  generatedAt: new Date().toISOString(),
  gitSha: gitSha(),
  packageName: packageJson.name,
  packageVersion: packageJson.version,
  results,
  runtime: {
    arch: os.arch(),
    bunVersion: Bun.version,
    platform: os.platform(),
  },
  samplesPerBenchmark: options.samples,
  scripts,
  version: 1,
};

console.log("\n## Aggregated benchmark medians");
for (const result of results) {
  console.log(
    `${result.name}: median=${formatValue(result.median, result.unit)} p95=${formatValue(result.p95, result.unit)}`,
  );
}

if ((options.out?.length ?? 0) > 0) {
  const outPath = path.resolve(options.out);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(runResult, null, 2)}\n`);
  console.log(`\nWrote ${outPath}`);
}
