#!/usr/bin/env bun
/**
 * Copy termcn's OpenTUI components and demos into examples/termcn/vendor/.
 *
 * Usage:
 *   bun examples/termcn/scripts/sync-vendor.ts                 # clone the pinned commit
 *   bun examples/termcn/scripts/sync-vendor.ts --source <dir>  # use an existing termcn checkout
 *
 * The vendor folder is git-ignored. It keeps termcn's MIT LICENSE and a
 * VENDORED.json record of the source commit.
 */

import { cp, mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { $ } from "bun";

import { rewriteImports } from "../sync/rewrite-imports.js";
import {
  BASES_SHIM,
  INK_SHIM,
  SEED_DIRECTORIES,
  TERMCN_COMMIT,
  TERMCN_REPO_URL,
  VENDOR_TSCONFIG,
} from "../sync/vendor-files.js";
import type { VendorManifest } from "../sync/vendor-files.js";

const VENDOR_DIR = path.join(import.meta.dir, "..", "vendor");

const SOURCE_EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

const parseSourceArgument = function parseSourceArgument(argv: readonly string[]): string | null {
  const index = argv.indexOf("--source");

  return index === -1 ? null : (argv[index + 1] ?? null);
};

const gitHead = async function gitHead(repoRoot: string): Promise<string> {
  const output = await $`git -C ${repoRoot} rev-parse HEAD`.text();

  return output.trim();
};

const cloneTermcn = async function cloneTermcn(): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(path.join(tmpdir(), "termcn-sync-"));

  console.log(`Cloning ${TERMCN_REPO_URL} at ${TERMCN_COMMIT.slice(0, 7)}...`);
  await $`git init --quiet ${root}`;
  await $`git -C ${root} fetch --quiet --depth 1 ${TERMCN_REPO_URL} ${TERMCN_COMMIT}`;
  await $`git -C ${root} checkout --quiet FETCH_HEAD`;

  return {
    cleanup: async () => {
      await rm(root, { force: true, recursive: true });
    },
    root,
  };
};

const isSourceFile = async function isSourceFile(file: string): Promise<boolean> {
  const info = await stat(file).catch(() => null);

  return info?.isFile() === true && /\.tsx?$/u.test(file);
};

const resolveSource = async function resolveSource(
  webRoot: string,
  target: string
): Promise<string | null> {
  const candidates = SOURCE_EXTENSIONS.map((extension) => `${target}${extension}`);

  const found = await Promise.all(
    candidates.map(async (candidate) => await isSourceFile(path.join(webRoot, candidate)))
  );

  return candidates[found.indexOf(true)] ?? null;
};

const listSourceFiles = async function listSourceFiles(
  webRoot: string,
  directory: string
): Promise<string[]> {
  const entries = await readdir(path.join(webRoot, directory), {
    recursive: true,
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile() && /\.tsx?$/u.test(entry.name))
    .map((entry) =>
      path.relative(webRoot, path.join(entry.parentPath, entry.name)).split(path.sep).join("/")
    );
};

/** Copy one file with rewritten imports; return the vendor files it imports through `@/`. */
const copyFile = async function copyFile(
  webRoot: string,
  file: string,
  missing: string[]
): Promise<string[]> {
  const source = await Bun.file(path.join(webRoot, file)).text();
  const { content, aliasTargets } = rewriteImports(source, file);

  await mkdir(path.dirname(path.join(VENDOR_DIR, file)), { recursive: true });
  await writeFile(path.join(VENDOR_DIR, file), content);

  const resolved = await Promise.all(
    aliasTargets.map(async (target) => {
      const result = await resolveSource(webRoot, target);

      if (result === null) {
        missing.push(`${file} -> @/${target}`);
      }

      return result;
    })
  );

  return resolved.filter((result): result is string => result !== null);
};

/**
 * Copy the seed folders plus every file they reach through `@/` aliases.
 * Each wave copies one breadth-first level of the import graph in parallel.
 */
const copySources = async function copySources(webRoot: string): Promise<number> {
  const seeds = await Promise.all(
    SEED_DIRECTORIES.map(async (directory) => await listSourceFiles(webRoot, directory))
  );

  const copied = new Set<string>();
  const missing: string[] = [];
  let wave = seeds.flat();

  while (wave.length > 0) {
    for (const file of wave) {
      copied.add(file);
    }

    // oxlint-disable-next-line no-await-in-loop -- each wave depends on the imports found by the previous wave
    const imported = await Promise.all(
      wave.map(async (file) => await copyFile(webRoot, file, missing))
    );

    wave = [...new Set(imported.flat())].filter((file) => !copied.has(file));
  }

  if (missing.length > 0) {
    throw new Error(`Unresolved termcn imports:\n  ${missing.join("\n  ")}`);
  }

  return copied.size;
};

const writeSupportFiles = async function writeSupportFiles(
  repoRoot: string,
  fileCount: number
): Promise<VendorManifest> {
  await mkdir(path.join(VENDOR_DIR, "shims"), { recursive: true });
  await writeFile(path.join(VENDOR_DIR, "shims", "ink.ts"), INK_SHIM);
  await writeFile(path.join(VENDOR_DIR, "shims", "bases.ts"), BASES_SHIM);
  await writeFile(path.join(VENDOR_DIR, "tsconfig.json"), VENDOR_TSCONFIG);
  await cp(path.join(repoRoot, "LICENSE"), path.join(VENDOR_DIR, "LICENSE"));

  const demos = await readdir(path.join(VENDOR_DIR, "examples", "opentui"));
  const commit = await gitHead(repoRoot);

  const manifest: VendorManifest = {
    commit,
    demos: demos.filter((name) => name.endsWith(".tsx")).length,
    files: fileCount,
    repository: TERMCN_REPO_URL,
    syncedAt: new Date().toISOString(),
  };

  await writeFile(path.join(VENDOR_DIR, "VENDORED.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  return manifest;
};

const main = async function main(): Promise<void> {
  const sourceArgument = parseSourceArgument(process.argv.slice(2));
  const checkout = sourceArgument === null ? await cloneTermcn() : null;
  const repoRoot = checkout?.root ?? path.resolve(sourceArgument ?? ".");

  try {
    const head = await gitHead(repoRoot);

    if (head !== TERMCN_COMMIT) {
      console.warn(`Warning: ${repoRoot} is at ${head}, not the pinned ${TERMCN_COMMIT}.`);
    }

    await rm(VENDOR_DIR, { force: true, recursive: true });
    const fileCount = await copySources(path.join(repoRoot, "apps", "web"));
    const manifest = await writeSupportFiles(repoRoot, fileCount);

    console.log(
      `Vendored ${manifest.files} files and ${manifest.demos} demos from termcn ${manifest.commit.slice(0, 7)} into ${VENDOR_DIR}`
    );
  } finally {
    await checkout?.cleanup();
  }
};

if (import.meta.main) {
  await main();
}
