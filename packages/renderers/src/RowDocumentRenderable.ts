import {
  type RenderContext,
  type LineInfoProvider,
  ScrollBoxRenderable,
  type ScrollBoxOptions,
  RGBA,
} from "@opentui/core"
import type { OptimizedBuffer } from "@opentui/core"
import type { DecorationLayer, RowDecoration } from "./DecorationLayer.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const DEFAULT_SIGN_COLUMN_WIDTH = 3

export interface RowDocumentPalette {
  gutterFg?: string
  gutterBg?: string
}

export interface RowDocumentOptions extends ScrollBoxOptions {
  mode?: "auto" | "multi" | "provider"

  // Gutter
  showGutter?: boolean
  showLineNumbers?: boolean
  lineNumberStart?: number
  signColumnWidth?: number
  gutterPaddingRight?: number

  // Multi-child: skip N leading children that aren't logical rows
  rowChildOffset?: number

  // Colors
  palette?: RowDocumentPalette
  decorations?: readonly DecorationLayer[]
}

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

function isRowContentProvider(x: unknown): x is LineInfoProvider {
  return (
    !!x && typeof x === "object" && "lineInfo" in x && "lineCount" in x && "virtualLineCount" in x
  )
}

// ---------------------------------------------------------------------------
// Color cache — avoids re-parsing hex strings every frame
// ---------------------------------------------------------------------------

const colorCache = new Map<string, RGBA>()

function cachedColor(hex: string): RGBA {
  let c = colorCache.get(hex)
  if (!c) {
    c = RGBA.fromHex(hex)
    colorCache.set(hex, c)
  }
  return c
}

function normalizePalette(palette: RowDocumentPalette = {}): Required<RowDocumentPalette> {
  return {
    gutterFg: palette.gutterFg ?? "#6e7681",
    gutterBg: palette.gutterBg ?? "#0d1117",
  }
}

function normalizeDecorationLayers(
  layers: readonly DecorationLayer[] | undefined,
): readonly DecorationLayer[] {
  if (!layers || layers.length === 0) return []
  return [...layers].sort((a, b) => a.priority - b.priority)
}

export function computeRowDocumentGutterWidth(opts: {
  showLineNumbers: boolean
  rowCount: number
  lineNumberStart?: number
  signColumnWidth?: number
  gutterPaddingRight?: number
}): number {
  let width = 0
  if (opts.showLineNumbers) {
    const maxLineNum = (opts.lineNumberStart ?? 1) + opts.rowCount - 1
    width += Math.max(String(maxLineNum).length, 1)
  }
  width += opts.signColumnWidth ?? 0
  width += opts.gutterPaddingRight ?? 1
  return width
}

// ---------------------------------------------------------------------------
// RowDocumentRenderable
// ---------------------------------------------------------------------------

export class RowDocumentRenderable extends ScrollBoxRenderable {
  // -- Options --
  private _mode: "auto" | "multi" | "provider"
  private _showGutter: boolean
  private _showLineNumbers: boolean
  private _lineNumberStart: number
  private _signColumnWidth: number
  private _gutterPaddingRight: number
  private _rowChildOffset: number
  private _palette: Required<RowDocumentPalette>
  private _layers: readonly DecorationLayer[] = []
  private _layerGutterBgs = new Map<number, string>()
  private _layerSigns = new Map<number, NonNullable<RowDecoration["sign"]>>()

  // -- Geometry arrays --
  private _rowVirtualStarts: number[] = []
  private _rowVirtualHeights: number[] = []
  private _virtualRowToRow: number[] = []
  private _virtualRowWraps: number[] = []
  private _rowCount = 0
  private _lastGeometryHash = ""

  constructor(ctx: RenderContext, options: RowDocumentOptions) {
    super(ctx, options)

    this._mode = options.mode ?? "auto"
    this._showGutter = options.showGutter ?? true
    this._showLineNumbers = options.showLineNumbers ?? true
    this._lineNumberStart = options.lineNumberStart ?? 1
    this._signColumnWidth = options.signColumnWidth ?? 0
    this._gutterPaddingRight = options.gutterPaddingRight ?? 1
    this._rowChildOffset = options.rowChildOffset ?? 0

    this._palette = normalizePalette(options.palette)
    this._layers = normalizeDecorationLayers(options.decorations)
  }

  // -----------------------------------------------------------------------
  // Decorations
  // -----------------------------------------------------------------------

  set decorations(layers: readonly DecorationLayer[] | undefined) {
    this._layers = normalizeDecorationLayers(layers)
    this.requestRender()
  }

  set palette(palette: RowDocumentPalette | undefined) {
    this._palette = normalizePalette(palette)
    this.requestRender()
  }

  // -----------------------------------------------------------------------
  // Gutter config setters
  // -----------------------------------------------------------------------

  set showGutter(value: boolean) {
    if (this._showGutter !== value) {
      this._showGutter = value
      this._applyGutterPadding()
      this.requestRender()
    }
  }

  set showLineNumbers(value: boolean) {
    if (this._showLineNumbers !== value) {
      this._showLineNumbers = value
      this._applyGutterPadding()
      this.requestRender()
    }
  }

  // -----------------------------------------------------------------------
  // Geometry — public API
  // -----------------------------------------------------------------------

  get rowCount(): number {
    return this._rowCount
  }

  get virtualRowCount(): number {
    return this._virtualRowToRow.length
  }

  getRowMetrics(row: number): { row: number; virtualTop: number; virtualHeight: number } | null {
    if (row < 0 || row >= this._rowCount) return null
    return {
      row,
      virtualTop: this._rowVirtualStarts[row],
      virtualHeight: this._rowVirtualHeights[row],
    }
  }

  getRowAtVirtualY(y: number): number {
    const clamped = Math.max(0, Math.min(y, this._virtualRowToRow.length - 1))
    const row = this._virtualRowToRow[clamped]
    if (row != null && row >= 0) return row
    // Gap row — search backward for nearest valid row
    for (let i = clamped - 1; i >= 0; i--) {
      const r = this._virtualRowToRow[i]
      if (r != null && r >= 0) return r
    }
    return 0
  }

  getVisibleRange(): {
    virtualTop: number
    virtualBottom: number
    firstRow: number
    lastRow: number
  } {
    const top = Math.floor(this.scrollTop)
    const bottom = top + this.viewport.height
    return {
      virtualTop: top,
      virtualBottom: bottom,
      firstRow: this.getRowAtVirtualY(top),
      lastRow: this.getRowAtVirtualY(bottom - 1),
    }
  }

  // -----------------------------------------------------------------------
  // scrollToRow
  // -----------------------------------------------------------------------

  scrollToRow(row: number, align: "nearest" | "start" | "center" | "end" = "nearest"): void {
    const metrics = this.getRowMetrics(row)
    if (!metrics) return

    const vpHeight = this.viewport.height
    const { virtualTop, virtualHeight } = metrics

    let target = this.scrollTop

    switch (align) {
      case "start":
        target = virtualTop
        break
      case "center":
        target = virtualTop - (vpHeight - virtualHeight) / 2
        break
      case "end":
        target = virtualTop + virtualHeight - vpHeight
        break
      case "nearest": {
        if (virtualTop < this.scrollTop) {
          target = virtualTop
        } else if (virtualTop + virtualHeight > this.scrollTop + vpHeight) {
          target = virtualTop + virtualHeight - vpHeight
        }
        break
      }
    }

    // When scrolling to the first row, include header content (pre-offset children)
    if (row === 0 && this._rowChildOffset > 0) {
      target = Math.min(target, 0)
    }

    // When the next row is the last logical row (e.g. bottom border),
    // extend the scroll to include it
    if (row + 1 === this._rowCount - 1) {
      const next = this.getRowMetrics(row + 1)
      if (next) {
        const bottomEdge = next.virtualTop + next.virtualHeight
        if (bottomEdge > target + vpHeight) {
          target = bottomEdge - vpHeight
        }
      }
    }

    this.scrollTop = Math.max(0, Math.round(target))
  }

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  protected renderSelf(buffer: OptimizedBuffer): void {
    // Let ScrollBox do its own rendering first
    super.renderSelf(buffer)

    // Recompute geometry every frame (cheap — just iterating children)
    this._computeGeometry()

    // Apply gutter padding to content area
    this._applyGutterPadding()

    // Paint decorations and gutter on top
    this._paintDecorations(buffer)
    if (this._showGutter) {
      this._paintGutter(buffer)
    }
  }

  // -----------------------------------------------------------------------
  // Geometry computation
  // -----------------------------------------------------------------------

  private _detectMode(): "multi" | "provider" {
    if (this._mode === "multi") return "multi"
    if (this._mode === "provider") return "provider"

    // Auto-detect: single child with LineInfoProvider → provider mode
    const children = this.getChildren()
    if (children.length === 1 && isRowContentProvider(children[0])) {
      return "provider"
    }
    return "multi"
  }

  private _computeGeometry(): void {
    const mode = this._detectMode()
    if (mode === "provider") {
      this._computeFromProvider()
    } else {
      this._computeFromChildren()
    }
  }

  private _computeFromChildren(): void {
    const children = this.getChildren()
    const offset = this._rowChildOffset
    const contentY = this.content.y
    const totalHeight = this.scrollHeight

    if (totalHeight === 0 || children.length <= offset) {
      this._finishGeometry([], [], [], [], 0)
      return
    }

    const rowCount = children.length - offset
    const rowVirtualStarts: number[] = []
    const rowVirtualHeights: number[] = []
    const virtualRowToRow = Array.from({ length: totalHeight }, () => -1)
    const virtualRowWraps = Array.from({ length: totalHeight }, () => 0)

    for (let i = offset; i < children.length; i++) {
      const row = i - offset
      const child = children[i]
      const childStart = child.y - contentY
      const h = Math.max(1, child.height)

      rowVirtualStarts[row] = childStart
      rowVirtualHeights[row] = h

      for (let r = 0; r < h; r++) {
        const vRow = childStart + r
        if (vRow >= 0 && vRow < totalHeight) {
          virtualRowToRow[vRow] = row
          virtualRowWraps[vRow] = r === 0 ? 0 : 1
        }
      }
    }

    this._finishGeometry(
      rowVirtualStarts,
      rowVirtualHeights,
      virtualRowToRow,
      virtualRowWraps,
      rowCount,
    )
  }

  private _computeFromProvider(): void {
    const children = this.getChildren()
    if (children.length === 0) return

    const provider = children[0] as unknown as LineInfoProvider
    if (!isRowContentProvider(provider)) return

    const info = provider.lineInfo
    const { lineSources, lineWraps } = info

    const rowVirtualStarts: number[] = []
    const rowVirtualHeights: number[] = []
    const virtualRowToRow: number[] = []
    const virtualRowWraps: number[] = []

    let currentRow = -1
    let rowCount = 0

    for (let v = 0; v < lineSources.length; v++) {
      const row = lineSources[v]
      virtualRowToRow[v] = row
      virtualRowWraps[v] = lineWraps[v]

      if (row !== currentRow) {
        // New logical row
        if (currentRow >= 0) {
          rowVirtualHeights[currentRow] = v - rowVirtualStarts[currentRow]
        }
        rowVirtualStarts[row] = v
        currentRow = row
        rowCount = Math.max(rowCount, row + 1)
      }
    }

    // Finalize last row
    if (currentRow >= 0) {
      rowVirtualHeights[currentRow] = lineSources.length - rowVirtualStarts[currentRow]
    }

    this._finishGeometry(
      rowVirtualStarts,
      rowVirtualHeights,
      virtualRowToRow,
      virtualRowWraps,
      rowCount,
    )
  }

  private _finishGeometry(
    rowVirtualStarts: number[],
    rowVirtualHeights: number[],
    virtualRowToRow: number[],
    virtualRowWraps: number[],
    rowCount: number,
  ): void {
    // Change detection via hash
    const hash = rowVirtualStarts.join(",")
    if (hash !== this._lastGeometryHash) {
      this._rowVirtualStarts = rowVirtualStarts
      this._rowVirtualHeights = rowVirtualHeights
      this._virtualRowToRow = virtualRowToRow
      this._virtualRowWraps = virtualRowWraps
      this._rowCount = rowCount
      this._lastGeometryHash = hash
      this.emit("row-geometry-change")
    }
  }

  // -----------------------------------------------------------------------
  // Gutter width calculation and padding
  // -----------------------------------------------------------------------

  private _computeGutterWidth(): number {
    if (!this._showGutter) return 0

    return computeRowDocumentGutterWidth({
      showLineNumbers: this._showLineNumbers,
      rowCount: this._rowCount,
      lineNumberStart: this._lineNumberStart,
      signColumnWidth: this._signColumnWidth,
      gutterPaddingRight: this._gutterPaddingRight,
    })
  }

  private _applyGutterPadding(): void {
    const gutterWidth = this._computeGutterWidth()
    this.content.paddingLeft = gutterWidth
  }

  // -----------------------------------------------------------------------
  // Decoration painting (row backgrounds)
  // -----------------------------------------------------------------------

  private _paintDecorations(buffer: OptimizedBuffer): void {
    this._layerGutterBgs = new Map()
    this._layerSigns = new Map()

    if (this._layers.length === 0) return

    const vpX = this.viewport.x
    const vpY = this.viewport.y
    const vpHeight = this.viewport.height
    const vpWidth = this.viewport.width
    const top = Math.floor(this.scrollTop)

    const { firstRow, lastRow } = this.getVisibleRange()
    const rowBgs = new Map<number, string>()
    const rowGutterBgs = new Map<number, string>()
    const rowSigns = new Map<number, NonNullable<RowDecoration["sign"]>>()

    for (const layer of this._layers) {
      for (const deco of layer.forVisibleRows(firstRow, lastRow)) {
        if (deco.background) rowBgs.set(deco.row, deco.background)
        if (deco.gutterBackground) rowGutterBgs.set(deco.row, deco.gutterBackground)
        if (deco.sign) rowSigns.set(deco.row, deco.sign)
      }
    }

    for (let screenY = 0; screenY < vpHeight; screenY++) {
      const vRow = top + screenY
      if (vRow >= this._virtualRowToRow.length) break

      const row = this._virtualRowToRow[vRow]
      if (row < 0) continue // Skip gap rows (margins)
      const bg = rowBgs.get(row)
      if (!bg) continue
      buffer.fillRect(vpX, vpY + screenY, vpWidth, 1, cachedColor(bg))
    }

    this._layerGutterBgs = rowGutterBgs
    this._layerSigns = rowSigns
  }

  // -----------------------------------------------------------------------
  // Gutter painting
  // -----------------------------------------------------------------------

  private _paintGutter(buffer: OptimizedBuffer): void {
    const gutterWidth = this._computeGutterWidth()
    if (gutterWidth === 0) return

    const vpX = this.viewport.x
    const vpY = this.viewport.y
    const vpHeight = this.viewport.height
    const top = Math.floor(this.scrollTop)

    const gutterBg = cachedColor(this._palette.gutterBg)
    const gutterFg = cachedColor(this._palette.gutterFg)

    // Fill gutter background
    buffer.fillRect(vpX, vpY, gutterWidth, vpHeight, gutterBg)

    const lineNumWidth = this._showLineNumbers
      ? Math.max(String(this._lineNumberStart + this._rowCount - 1).length, 1)
      : 0

    for (let screenY = 0; screenY < vpHeight; screenY++) {
      const vRow = top + screenY
      if (vRow >= this._virtualRowToRow.length) break

      const row = this._virtualRowToRow[vRow]
      if (row < 0) continue // Skip gap rows (margins)
      const isFirstLine = this._virtualRowWraps[vRow] === 0

      if (!isFirstLine) continue

      const drawX = vpX
      let col = 0

      const rowGutterHex = this._layerGutterBgs.get(row)
      const effectiveGutterBg = rowGutterHex ? cachedColor(rowGutterHex) : gutterBg
      if (rowGutterHex) {
        buffer.fillRect(drawX, vpY + screenY, gutterWidth, 1, effectiveGutterBg)
      }

      // Line number
      if (this._showLineNumbers) {
        const lineNum = String(this._lineNumberStart + row)
        const padded = lineNum.padStart(lineNumWidth, " ")
        buffer.drawText(padded, drawX + col, vpY + screenY, gutterFg, effectiveGutterBg)
        col += lineNumWidth
      }

      // Sign column
      if (this._signColumnWidth > 0) {
        const sign = this._layerSigns.get(row)

        if (sign) {
          const signFg = sign.fg ? cachedColor(sign.fg) : gutterFg
          buffer.drawText(
            sign.text.slice(0, this._signColumnWidth),
            drawX + col,
            vpY + screenY,
            signFg,
            effectiveGutterBg,
          )
        }
      }
    }
  }
}
