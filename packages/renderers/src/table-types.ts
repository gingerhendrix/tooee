export interface ColumnDef {
  key: string
  header?: string
  align?: "left" | "right"
}

export type TableRow = Record<string, unknown>
