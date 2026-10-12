/**
 * JSON boundary for termcn registry documents. Only this module inspects a
 * JSON value's representation; callers work with the decoded domain types.
 */

/** The JSON grammar, exactly as `JSON.parse` produces it without a reviver. */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | JsonObject;

/** A JSON object. A key that is absent from the document reads as `undefined`. */
export interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}

export const parseJsonDocument = function parseJsonDocument(text: string): JsonValue {
  // SAFETY: `JSON.parse` without a reviver produces only the JSON grammar, and
  // `JsonValue` is that grammar, so the assertion narrows nothing.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON.parse is typed `any`; the SAFETY note above states the invariant
  return JSON.parse(text) as JsonValue;
};

export const isJsonObject = function isJsonObject(
  value: JsonValue | undefined
): value is JsonObject {
  return value instanceof Object && !Array.isArray(value);
};

export const isJsonString = function isJsonString(value: JsonValue | undefined): value is string {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- primitive check inside the JSON boundary decoder
  return typeof value === "string";
};

export const isJsonArray = function isJsonArray(
  value: JsonValue | undefined
): value is readonly JsonValue[] {
  return Array.isArray(value);
};

/** A string field, or the fallback when the field is absent or not a string. */
export const jsonString = function jsonString(
  value: JsonValue | undefined,
  fallback: string
): string {
  return isJsonString(value) ? value : fallback;
};

/** The string members of an array field; other members and non-arrays read as empty. */
export const jsonStrings = function jsonStrings(value: JsonValue | undefined): string[] {
  return isJsonArray(value) ? value.filter(isJsonString) : [];
};

/** The array stored under `key` in a top-level object, or null. */
export const jsonArrayField = function jsonArrayField(
  document: JsonValue,
  key: string
): readonly JsonValue[] | null {
  if (!isJsonObject(document)) {
    return null;
  }

  const value = document[key];

  return isJsonArray(value) ? value : null;
};
