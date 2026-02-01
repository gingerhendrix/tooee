import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import type { TooeeConfig } from "./types.ts"

const DEFAULTS: TooeeConfig = {
  theme: {
    name: "tokyonight",
    mode: "dark",
  },
}

function deepMerge(target: any, source: any): any {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] ?? {}, source[key])
    } else if (source[key] !== undefined) {
      result[key] = source[key]
    }
  }
  return result
}

function readJsonFile(path: string): Partial<TooeeConfig> {
  try {
    if (!existsSync(path)) return {}
    return JSON.parse(readFileSync(path, "utf-8")) as Partial<TooeeConfig>
  } catch {
    return {}
  }
}

function getGlobalConfigPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME ?? join(process.env.HOME ?? "", ".config")
  return join(xdg, "tooee", "config.json")
}

function findProjectConfig(): Partial<TooeeConfig> {
  let dir = process.cwd()
  const seen = new Set<string>()
  while (dir && !seen.has(dir)) {
    seen.add(dir)
    const configPath = join(dir, ".tooee", "config.json")
    if (existsSync(configPath)) {
      return readJsonFile(configPath)
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return {}
}

export function loadConfig(overrides?: Partial<TooeeConfig>): TooeeConfig {
  let config: TooeeConfig = { ...DEFAULTS }
  config = deepMerge(config, readJsonFile(getGlobalConfigPath()))
  config = deepMerge(config, findProjectConfig())
  if (overrides) {
    config = deepMerge(config, overrides)
  }
  return config
}

export function writeGlobalConfig(partial: Partial<TooeeConfig>): void {
  const path = getGlobalConfigPath()
  const dir = dirname(path)
  try {
    const existing = readJsonFile(path)
    const merged = deepMerge(existing, partial)
    mkdirSync(dir, { recursive: true })
    writeFileSync(path, JSON.stringify(merged, null, 2) + "\n")
  } catch {
    // ignore write errors
  }
}
