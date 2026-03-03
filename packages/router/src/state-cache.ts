export class StateCache {
  private cache = new Map<string, unknown>()

  save(key: string, state: unknown): void {
    this.cache.set(key, state)
  }

  restore<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined
  }

  clear(key: string): void {
    this.cache.delete(key)
  }

  clearAll(): void {
    this.cache.clear()
  }
}
