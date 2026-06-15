import type { ColumnDef, TableRow } from "@tooee/renderers"
import type { CodeContent, MarkdownContent, TableContent } from "@tooee/view"

export interface FixtureTier {
  name: "moderate" | "large"
  markdownSections: number
  codeLines: number
  tableRows: number
  tableColumns: number
}

export const FIXTURE_TIERS: Record<FixtureTier["name"], FixtureTier> = {
  moderate: {
    name: "moderate",
    markdownSections: 36,
    codeLines: 650,
    tableRows: 400,
    tableColumns: 8,
  },
  large: {
    name: "large",
    markdownSections: 140,
    codeLines: 3500,
    tableRows: 2500,
    tableColumns: 12,
  },
}

const WORDS = [
  "atlas",
  "brisk",
  "cinder",
  "delta",
  "ember",
  "fjord",
  "glyph",
  "harbor",
  "ion",
  "juniper",
  "kernel",
  "lumen",
]

function sentence(seed: number, words = 16): string {
  const parts: string[] = []
  for (let index = 0; index < words; index += 1) {
    parts.push(WORDS[(seed + index * 7) % WORDS.length] ?? "word")
  }
  return `${parts.join(" ")}.`
}

function markdownTable(section: number): string {
  const rows = ["| Metric | Value | Notes |", "| --- | ---: | --- |"]
  for (let row = 0; row < 6; row += 1) {
    rows.push(`| item-${section}-${row} | ${section * 100 + row} | ${sentence(section + row, 7)} |`)
  }
  return rows.join("\n")
}

export function makeMarkdownFixture(tier: FixtureTier = FIXTURE_TIERS.moderate): MarkdownContent {
  const sections: string[] = ["# Tooee synthetic markdown benchmark", ""]

  for (let section = 0; section < tier.markdownSections; section += 1) {
    sections.push(`## Section ${section}`)
    sections.push(`${sentence(section, 20)} **strong-${section}** and \`inline-${section}\`.`)
    sections.push("")
    sections.push("- first deterministic list entry")
    sections.push("- second deterministic list entry")
    sections.push("- nested benchmark note")
    sections.push("")

    if (section % 4 === 0) {
      sections.push("```ts")
      sections.push(`export function section${section}(input: number) {`)
      sections.push(`  return input + ${section}`)
      sections.push("}")
      sections.push("```")
      sections.push("")
    }

    if (section % 6 === 0) {
      sections.push(markdownTable(section))
      sections.push("")
    }
  }

  const markdown = sections.join("\n")
  return {
    format: "markdown",
    title: `markdown-${tier.name}`,
    markdown,
  }
}

export function makeCodeFixture(tier: FixtureTier = FIXTURE_TIERS.moderate): CodeContent {
  const lines: string[] = []
  for (let line = 0; line < tier.codeLines; line += 1) {
    const label = WORDS[line % WORDS.length]
    lines.push(
      `export const value${line} = { id: ${line}, label: "${label}", score: ${(line * 13) % 997} }`,
    )
  }

  return {
    format: "code",
    title: `code-${tier.name}`,
    language: "ts",
    code: lines.join("\n"),
  }
}

export function makeTableFixture(tier: FixtureTier = FIXTURE_TIERS.moderate): TableContent {
  const columns: ColumnDef[] = Array.from({ length: tier.tableColumns }, (_, index) => ({
    key: `col${index}`,
    header: `Column ${index}`,
    align: index % 3 === 0 ? "right" : "left",
  }))

  const rows: TableRow[] = Array.from({ length: tier.tableRows }, (_, rowIndex) => {
    const row: TableRow = {}
    for (const [columnIndex, column] of columns.entries()) {
      row[column.key] =
        columnIndex % 3 === 0
          ? rowIndex * (columnIndex + 1)
          : `${WORDS[(rowIndex + columnIndex) % WORDS.length]}-${rowIndex}-${columnIndex}`
    }
    return row
  })

  return {
    format: "table",
    title: `table-${tier.name}`,
    columns,
    rows,
  }
}

export function countLines(text: string): number {
  return text.split("\n").length
}
