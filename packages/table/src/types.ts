export interface TableContent {
  headers: string[]
  rows: string[][]
  title?: string
  format: "csv" | "tsv" | "json" | "unknown"
}

export interface TableContentProvider {
  load(): Promise<TableContent> | TableContent
}
