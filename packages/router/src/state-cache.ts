import type { Codec } from "./types.js";

/**
 * A cache key that carries the type of the value stored under it AND the
 * decoder for reading it back. Key and value type stay coupled in both
 * directions: `save` will not accept a value of a different type, and `restore`
 * decodes the stored `unknown` instead of asserting a caller-selected type.
 */
export interface StateKey<T> {
  readonly name: string;
  readonly parse: (value: unknown) => T;
}

export const createStateKey = function createStateKey<T>(
  name: string,
  codec: Codec<T>,
): StateKey<T> {
  return { name, parse: codec.parse };
};

export class StateCache {
  private readonly cache = new Map<string, unknown>();

  save<T>(key: StateKey<T>, state: T): void {
    this.cache.set(key.name, state);
  }

  restore<T>(key: StateKey<T>): T | undefined {
    const value = this.cache.get(key.name);
    return value === undefined ? undefined : key.parse(value);
  }

  /** Clearing needs only the key's identity, not its value type. */
  clear(key: StateKey<unknown> | string): void {
    // A StateKey is the object branch; a cache name is the primitive branch.
    // oxlint-disable-next-line unicorn/no-instanceof-builtins -- StateKey is created in this package and does not cross a realm boundary
    this.cache.delete(key instanceof Object ? key.name : key);
  }

  clearAll(): void {
    this.cache.clear();
  }
}
