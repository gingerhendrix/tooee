import type { ChooseItem, ChooseSource } from "./types.js"

/** Resolve every public Choose source shape through one compatibility boundary. */
export function loadChooseSource(source: ChooseSource): ChooseItem[] | Promise<ChooseItem[]> {
  if (Array.isArray(source)) return source
  if (typeof source === "function") return source()
  return source.load()
}

export function chooseSourceError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
