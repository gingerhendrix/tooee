import type { ChooseItem, ChooseContentProvider } from "./types.js"

export function createStdinChooseProvider(): ChooseContentProvider {
  return {
    async load(): Promise<ChooseItem[]> {
      const text = await new Response(Bun.stdin.stream() as unknown as ReadableStream).text()
      return text
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => ({ text: line }))
    },
  }
}

export function createStaticProvider(items: ChooseItem[]): ChooseContentProvider {
  return {
    load: () => items,
  }
}
