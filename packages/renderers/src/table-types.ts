export interface ColumnDef {
  key: string;
  header?: string;
  align?: "left" | "right";
}

/**
 * One public table row. Hosts can supply any JavaScript value because the table
 * formatter has long supported dates, functions, symbols, and arbitrary objects.
 */
// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- public compatibility contract; formatCellValue owns conversion of every cell value
export type TableRow = Record<string, unknown>;
