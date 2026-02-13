import { mkdirSync, rmSync } from "fs"
import { join, resolve } from "path"

const REPO_ROOT = resolve(import.meta.dir, "../..")
const BASE_DIR = join(REPO_ROOT, ".tmp", "test-config")

function resolveHome(namespace: string): string {
  return join(BASE_DIR, namespace)
}

function resolveTooeeDir(namespace: string): string {
  return join(resolveHome(namespace), "tooee")
}

export function ensureTestConfigHome(namespace: string): string {
  const dir = resolveTooeeDir(namespace)
  mkdirSync(dir, { recursive: true })
  return resolveHome(namespace)
}

export function resetTestConfig(namespace: string): void {
  const dir = resolveTooeeDir(namespace)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
}
