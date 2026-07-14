import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const BASE_DIR = path.join(REPO_ROOT, ".tmp", "test-config");

const resolveHome = function resolveHome(namespace: string): string {
  return path.join(BASE_DIR, namespace);
};

const resolveTooeeDir = function resolveTooeeDir(namespace: string): string {
  return path.join(resolveHome(namespace), "tooee");
};

export const ensureTestConfigHome = function ensureTestConfigHome(namespace: string): string {
  const dir = resolveTooeeDir(namespace);
  mkdirSync(dir, { recursive: true });
  return resolveHome(namespace);
};

export const resetTestConfig = function resetTestConfig(namespace: string): void {
  const dir = resolveTooeeDir(namespace);
  rmSync(dir, { force: true, recursive: true });
  mkdirSync(dir, { recursive: true });
};
