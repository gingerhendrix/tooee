export class StateCache {
  private cache = new Map<string, unknown>();

  save(key: string, state: unknown): void {
    this.cache.set(key, state);
  }

  restore<T>(key: string): T | undefined {
    // Deferred(lint-sweep): typed routes/keys redesign (separate stream)
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- caller-selected T over unknown storage
    return this.cache.get(key) as T | undefined;
  }

  clear(key: string): void {
    this.cache.delete(key);
  }

  clearAll(): void {
    this.cache.clear();
  }
}
