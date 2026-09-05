import type { ColumnDef, TableRow } from "./table-types.js";

export interface TableData {
  columns: ColumnDef[];
  rows: TableRow[];
}

export interface ParsedTable extends TableData {
  format: Format;
}

type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;

interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}

const parseJsonDocument = function parseJsonDocument(input: string): JsonValue {
  // SAFETY: JSON.parse without a reviver produces only values in the JsonValue grammar above.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON.parse is typed any; JsonValue restates the parser contract
  return JSON.parse(input) as JsonValue;
};

const isJsonArray = function isJsonArray(value: JsonValue): value is JsonValue[] {
  return Array.isArray(value);
};

const jsonEntryKeys = function jsonEntryKeys(value: JsonValue): string[] {
  if (value === null) {
    throw new TypeError("A JSON table row cannot be null");
  }
  return Object.keys(value);
};

const readJsonEntry = function readJsonEntry(value: JsonValue, key: string): JsonValue | undefined {
  if (isJsonArray(value)) {
    return value[Number(key)];
  }
  if (value instanceof Object) {
    return value[key];
  }
  if (Object.prototype.toString.call(value) === "[object String]") {
    return String.prototype.charAt.call(value, Number(key));
  }
  return undefined;
};

export const parseCSV = function parseCSV(input: string): TableData {
  // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): parser helpers are kept below the public entry points
  const lines = splitLines(input);
  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }
  // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): parser helpers are kept below the public entry points
  const columns = createColumnDefs(parseCSVLine(lines[0]));
  // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): parser helpers are kept below the public entry points
  const rows = buildRows(columns, lines.slice(1).map(parseCSVLine));
  return { columns, rows };
};

const parseCSVLine = function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      i += 1;
      let field = "";
      while (i < line.length) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i += 1;
            break;
          }
        } else {
          field += line[i];
          i += 1;
        }
      }
      fields.push(field);
      // Skip the comma after a quoted field.
      if (i < line.length && line[i] === ",") {
        i += 1;
      }
    } else {
      const nextComma = line.indexOf(",", i);
      if (nextComma === -1) {
        fields.push(line.slice(i));
        break;
      } else {
        fields.push(line.slice(i, nextComma));
        i = nextComma + 1;
      }
    }
  }
  return fields;
};

export const parseTSV = function parseTSV(input: string): TableData {
  // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): parser helpers are kept below the public entry points
  const lines = splitLines(input);
  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }
  // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): parser helpers are kept below the public entry points
  const columns = createColumnDefs(lines[0].split("\t"));
  // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): parser helpers are kept below the public entry points
  const rows = buildRows(
    columns,
    lines.slice(1).map((line) => line.split("\t")),
  );
  return { columns, rows };
};

export const parseJSON = function parseJSON(input: string): TableData {
  const data = parseJsonDocument(input);
  if (!isJsonArray(data) || data.length === 0) {
    return { columns: [], rows: [] };
  }
  const keys = [...new Set(data.flatMap(jsonEntryKeys))];
  const columns: ColumnDef[] = keys.map((key) => ({ header: key, key }));
  const rows = data.map((item) => {
    const row: TableRow = {};
    for (const column of columns) {
      row[column.key] = readJsonEntry(item, column.key) ?? "";
    }
    return row;
  });
  return { columns, rows };
};

export type Format = "csv" | "tsv" | "json" | "unknown";

export const detectFormat = function detectFormat(input: string): Format {
  const trimmed = input.trimStart();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = parseJsonDocument(trimmed);
      if (isJsonArray(parsed)) {
        return "json";
      }
    } catch {
      // Not valid JSON — fall through to the delimiter sniffing below.
    }
  }
  const firstLine = input.split("\n")[0] ?? "";
  if (firstLine.includes("\t")) {
    return "tsv";
  }
  if (firstLine.includes(",")) {
    return "csv";
  }
  return "unknown";
};

export const parseAuto = function parseAuto(input: string): ParsedTable {
  const format = detectFormat(input);
  let columns: ColumnDef[];
  let rows: TableRow[];
  switch (format) {
    case "csv": {
      ({ columns, rows } = parseCSV(input));
      break;
    }
    case "tsv": {
      ({ columns, rows } = parseTSV(input));
      break;
    }
    case "json": {
      ({ columns, rows } = parseJSON(input));
      break;
    }
    case "unknown": {
      // Fall back to CSV
      ({ columns, rows } = parseCSV(input));
      break;
    }
    default: {
      ({ columns, rows } = parseCSV(input));
      break;
    }
  }
  return { columns, format, rows };
};

const splitLines = function splitLines(input: string): string[] {
  return input.split("\n").filter((line) => line.trim().length > 0);
};

const createColumnDefs = function createColumnDefs(rawHeaders: string[]): ColumnDef[] {
  const seen = new Map<string, number>();
  return rawHeaders.map((header, index) => {
    const trimmed = header.trim();
    const fallback = `column_${index + 1}`;
    const base = trimmed === "" ? fallback : trimmed;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const key = count === 0 ? base : `${base}_${count + 1}`;
    return {
      header: trimmed || undefined,
      key,
    };
  });
};

const buildRows = function buildRows(columns: ColumnDef[], rawRows: string[][]): TableRow[] {
  return rawRows.map((row) => {
    const record: TableRow = {};
    for (const [index, column] of columns.entries()) {
      record[column.key] = row[index] ?? "";
    }
    return record;
  });
};
