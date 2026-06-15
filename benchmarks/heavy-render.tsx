#!/usr/bin/env bun
import { CodeView, MarkdownView, Table } from "@tooee/renderers"
import { TooeeProvider } from "@tooee/shell"
import {
  countLines,
  FIXTURE_TIERS,
  makeCodeFixture,
  makeMarkdownFixture,
  makeTableFixture,
} from "./lib/fixtures.ts"
import { printMetric } from "./lib/benchmark-result.ts"
import { DEFAULT_VIEWPORT, measureFirstFrame, printMemoryMetrics } from "./lib/render.tsx"

const tier = FIXTURE_TIERS.large
const markdown = makeMarkdownFixture(tier)
const code = makeCodeFixture(tier)
const table = makeTableFixture(tier)

printMetric("markdown_line_count", countLines(markdown.markdown))
printMetric("code_line_count", countLines(code.code))
printMetric("table_row_count", table.rows.length)
printMetric("table_column_count", table.columns.length)

await measureFirstFrame(
  "markdown_large",
  <TooeeProvider initialMode="cursor">
    <MarkdownView content={markdown.markdown} />
  </TooeeProvider>,
)
printMemoryMetrics("markdown_large_after_first_frame")

await measureFirstFrame(
  "code_large",
  <TooeeProvider initialMode="cursor">
    <CodeView content={code.code} language={code.language} />
  </TooeeProvider>,
)
printMemoryMetrics("code_large_after_first_frame")

await measureFirstFrame(
  "table_large",
  <TooeeProvider initialMode="cursor">
    <Table columns={table.columns} rows={table.rows} maxWidth={DEFAULT_VIEWPORT.width} />
  </TooeeProvider>,
)
printMemoryMetrics("table_large_after_first_frame")
