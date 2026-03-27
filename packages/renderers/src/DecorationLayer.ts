export interface RowDecoration {
  row: number
  background?: string
  gutterBackground?: string
  sign?: { text: string; fg?: string }
}

export interface DecorationLayer {
  readonly priority: number
  forVisibleRows(from: number, to: number): Iterable<RowDecoration>
}
