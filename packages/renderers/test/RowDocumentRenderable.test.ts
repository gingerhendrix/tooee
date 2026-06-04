import { describe, expect, test } from "bun:test"
import {
  DEFAULT_SIGN_COLUMN_WIDTH,
  computeRowDocumentGutterWidth,
} from "../src/RowDocumentRenderable.js"

describe("row document gutter", () => {
  test("reserves three columns for gutter signs by default", () => {
    expect(DEFAULT_SIGN_COLUMN_WIDTH).toBe(3)
    expect(
      computeRowDocumentGutterWidth({
        showLineNumbers: true,
        rowCount: 12,
        signColumnWidth: DEFAULT_SIGN_COLUMN_WIDTH,
      }),
    ).toBe(6)
  })
})
