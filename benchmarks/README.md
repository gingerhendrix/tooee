# Tooee benchmarks

Tooee benchmarks are local diagnostics for rendering and interaction performance. They are intentionally separate from `bun run test`: benchmark numbers are noisy across machines, terminal backends, CPU governors, and background load.

The suite follows the same broad shape as Hunk's benchmark setup: focused scripts emit parseable `METRIC name=value` lines, `benchmarks/run.ts` repeats scripts, aggregates samples, prints medians/p95s, and can write JSON into ignored local result files.

## Running the default suite

```bash
bun run bench -- --samples 3 --out benchmarks/results/local.json
```

The default suite is fast and local-only:

- `render-first-frame.tsx` measures first-frame render time for deterministic moderate markdown, code, and table fixtures.
- `interaction-latency.tsx` mounts the full `@tooee/view` stack in the OpenTUI test renderer and measures `j` and `ctrl+d` navigation latency plus retained memory after navigation.

For a quicker smoke sample while developing:

```bash
bun run bench -- --samples 1 --script render-first-frame.tsx
bun run bench:render
bun run bench:interaction
```

## Data-preparation microbenchmarks

Use `bench:data-prep` when a renderer-level number needs to be separated into parsing/normalization cost vs React/OpenTUI render cost:

```bash
bun run bench:data-prep
TOOEE_BENCH_DATA_PREP_ITERATIONS=50 bun run bench:data-prep
bun run bench -- --samples 3 --script data-prep.ts --out benchmarks/results/data-prep.json
```

`data-prep.ts` emits median timings for markdown lexing, markdown lex+flatten, table row normalization, and table normalization+width calculation across deterministic moderate and large fixtures. It does not mount OpenTUI or React components, so it is best used to decide whether a future optimization should target data preparation or rendered element/layout work.

## Opt-in heavy tier

Large fixtures are useful before optimizing big-file behavior, but they are excluded from the default suite because they can be slow on current hot paths.

```bash
bun run bench -- --samples 1 --include-heavy --out benchmarks/results/local-heavy.json
# or
TOOEE_BENCH_INCLUDE_HEAVY=1 bun run bench -- --samples 1
bun run bench:heavy
bun run bench:heavy:interaction
```

`heavy-render.tsx` measures first-frame render time and memory after first frame for larger markdown, code, and table fixtures. `heavy-interaction.tsx` focuses on large-table navigation latency through the full `@tooee/view` stack; it defaults to fewer keypresses and can be tuned with `TOOEE_BENCH_HEAVY_INTERACTIONS=N`.

## Comparing JSON results

Use `bench:compare` to compare two aggregated JSON outputs without ad hoc scripts:

```bash
bun run bench:compare -- benchmarks/results/baseline.json benchmarks/results/candidate.json
bun run bench:compare -- benchmarks/results/baseline.json benchmarks/results/candidate.json --fail-on-regression
```

The comparison prints median deltas for metrics marked comparable. Time and memory metrics use the per-metric thresholds encoded in `benchmarks/lib/benchmark-result.ts`; `--fail-on-regression` exits non-zero only when a comparable metric exceeds its threshold.

## Output format

Focused scripts print metrics as plain lines:

```text
METRIC markdown_moderate_first_frame_ms=42.17
METRIC table_row_count=400
```

Metric names ending in `_ms` are treated as comparable time metrics. RSS/heap metrics are treated as comparable byte metrics. Count metrics are informational.

Aggregated JSON written with `--out` has this shape:

```json
{
  "version": 1,
  "samplesPerBenchmark": 3,
  "scripts": ["render-first-frame.tsx", "interaction-latency.tsx"],
  "results": [
    {
      "name": "render-first-frame/markdown_moderate_first_frame_ms",
      "unit": "ms",
      "samples": [42.17, 41.82, 43.03],
      "median": 42.17,
      "p75": 43.03,
      "p95": 43.03,
      "comparable": true
    }
  ]
}
```

Local result files under `benchmarks/results/` are ignored by git.

## Fixture design

Fixtures are generated deterministically in `benchmarks/lib/fixtures.ts` instead of checked in as large files:

- Markdown includes headings, paragraphs, lists, fenced TypeScript blocks, and markdown tables.
- Code is a large deterministic TypeScript-like source file.
- Tables use predictable row/column counts with mixed numeric and string content, exercising width calculation, row rendering, and large-table navigation in the opt-in heavy interaction script.

The default `moderate` tier is intended for frequent local diagnostics. The `large` tier is reserved for explicit `--include-heavy` / `TOOEE_BENCH_INCLUDE_HEAVY=1` runs.

## Interpreting results

Use `--samples 5` or higher when comparing a borderline change. Run on an otherwise quiet machine and compare medians first, then p95 for interaction latency. Treat benchmark output as a diagnostic signal, not as a CI gate, until Tooee has stable baselines and acceptable machine-to-machine variance.
