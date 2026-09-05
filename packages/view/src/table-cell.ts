import type { TableRow } from "@tooee/renderers";

type TableCellValue = TableRow[string];

interface TextTableCell {
  kind: "text";
  value: string;
}

interface StructuredTableCell {
  kind: "structured";
  value: object;
}

type DecodedTableCell = TextTableCell | StructuredTableCell;

/** Decode a table row value once into text or a structured value for JSON serialization. */
const decodeTableCell = function decodeTableCell(value: TableCellValue): DecodedTableCell {
  if (value === null) {
    return { kind: "text", value: "" };
  }

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- TableRow values are an external data boundary; this switch decodes each JavaScript value category into the viewer's two cell domains
  switch (typeof value) {
    case "undefined": {
      return { kind: "text", value: "" };
    }
    case "string": {
      return { kind: "text", value };
    }
    case "number":
    case "bigint":
    case "boolean":
    case "symbol": {
      return { kind: "text", value: String(value) };
    }
    case "function": {
      return { kind: "text", value: Function.prototype.toString.call(value) };
    }
    case "object": {
      return { kind: "structured", value };
    }
    default: {
      return { kind: "text", value: "" };
    }
  }
};

export const stringifyTableCell = function stringifyTableCell(
  value: TableCellValue,
): string | undefined {
  const decoded = decodeTableCell(value);
  if (decoded.kind === "text") {
    return decoded.value;
  }

  try {
    return JSON.stringify(decoded.value);
  } catch {
    return Array.isArray(decoded.value)
      ? decoded.value.join(",")
      : Object.prototype.toString.call(decoded.value);
  }
};
