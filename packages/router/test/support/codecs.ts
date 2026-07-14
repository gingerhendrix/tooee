import type { Codec } from "@tooee/router";

/**
 * Concrete codecs for the router tests. Each one validates and REBUILDS the
 * value, so the returned object really is the declared shape rather than an
 * `unknown` that has been re-labelled by an assertion.
 */

const asRecord = function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new TypeError(`Expected an object, got ${typeof value}`);
  }
  return { ...value };
};

const stringAt = function stringAt(record: Record<string, unknown>, field: string): string {
  const raw = record[field];
  if (typeof raw !== "string") {
    throw new TypeError(`Expected "${field}" to be a string`);
  }
  return raw;
};

const numberAt = function numberAt(record: Record<string, unknown>, field: string): number {
  const raw = record[field];
  if (typeof raw !== "number") {
    throw new TypeError(`Expected "${field}" to be a number`);
  }
  return raw;
};

export const idParams: Codec<{ id: string }> = {
  parse: (value) => ({ id: stringAt(asRecord(value), "id") }),
};

export const messageData: Codec<{ message: string }> = {
  parse: (value) => ({ message: stringAt(asRecord(value), "message") }),
};

export const echoData: Codec<{ echo: string }> = {
  parse: (value) => ({ echo: stringAt(asRecord(value), "echo") }),
};

export const valueState: Codec<{ value: string }> = {
  parse: (value) => ({ value: stringAt(asRecord(value), "value") }),
};

export const counterState: Codec<{ counter: number }> = {
  parse: (value) => ({ counter: numberAt(asRecord(value), "counter") }),
};

export const numberState: Codec<number> = {
  parse: (value) => {
    if (typeof value !== "number") {
      throw new TypeError(`Expected a number, got ${typeof value}`);
    }
    return value;
  },
};
