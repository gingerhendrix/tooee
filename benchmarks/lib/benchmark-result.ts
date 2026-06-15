export type BenchmarkUnit = "ms" | "bytes" | "count" | "ratio" | "boolean"

export interface BenchmarkThreshold {
  maxRegressionRatio: number
  minAbsoluteRegression: number
}

export interface BenchmarkMetricResult {
  name: string
  source: string
  metric: string
  unit: BenchmarkUnit
  comparable: boolean
  threshold?: BenchmarkThreshold
  samples: number[]
  median: number
  p75: number
  p95: number
  min: number
  max: number
}

export interface BenchmarkRunResult {
  version: 1
  generatedAt: string
  gitSha?: string
  packageName?: string
  packageVersion?: string
  runtime: {
    bunVersion: string
    platform: string
    arch: string
  }
  samplesPerBenchmark: number
  scripts: string[]
  results: BenchmarkMetricResult[]
}

export function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  )
  return sorted[index] ?? 0
}

export function classifyMetric(
  metric: string,
): Pick<BenchmarkMetricResult, "unit" | "comparable" | "threshold"> {
  if (metric.endsWith("_ms")) {
    return {
      unit: "ms",
      comparable: true,
      threshold: { maxRegressionRatio: 1.15, minAbsoluteRegression: 5 },
    }
  }

  if (metric.includes("rss") || metric.includes("heap") || metric.endsWith("_bytes")) {
    return {
      unit: "bytes",
      comparable: metric.includes("rss") || metric.includes("heap"),
      threshold: { maxRegressionRatio: 1.2, minAbsoluteRegression: 8 * 1024 * 1024 },
    }
  }

  if (metric.startsWith("is_") || metric.endsWith("_available")) {
    return { unit: "boolean", comparable: false }
  }

  if (metric.endsWith("_ratio")) {
    return { unit: "ratio", comparable: false }
  }

  return { unit: "count", comparable: false }
}

export function aggregateMetric(
  source: string,
  metric: string,
  samples: number[],
): BenchmarkMetricResult {
  const sorted = [...samples].sort((left, right) => left - right)
  const classification = classifyMetric(metric)

  return {
    name: `${source}/${metric}`,
    source,
    metric,
    samples,
    median: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p95: percentile(sorted, 95),
    min: sorted[0] ?? 0,
    max: sorted.at(-1) ?? 0,
    ...classification,
  }
}

export function printMetric(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`Metric ${name} is not finite: ${value}`)
  }
  console.log(`METRIC ${name}=${value}`)
}

export function printTimedMetric(name: string, valueMs: number): void {
  printMetric(name.endsWith("_ms") ? name : `${name}_ms`, Number(valueMs.toFixed(2)))
}
