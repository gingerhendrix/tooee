import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SIGN_COLUMN_WIDTH,
  computeRowDocumentGutterWidth,
} from "../src/row-document-renderable.js";

describe("row document gutter", () => {
  test("reserves three columns for gutter signs by default", () => {
    expect(DEFAULT_SIGN_COLUMN_WIDTH).toBe(3);
    expect(
      computeRowDocumentGutterWidth({
        rowCount: 12,
        showLineNumbers: true,
        signColumnWidth: DEFAULT_SIGN_COLUMN_WIDTH,
      }),
    ).toBe(6);
  });
});
