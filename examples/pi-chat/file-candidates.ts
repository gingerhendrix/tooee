/**
 * The files the attach chooser lists: paths relative to the working
 * directory. In a Git work tree this is `git ls-files` (tracked files and
 * untracked files that Git does not ignore). Elsewhere it is a walk of the
 * directory that skips hidden entries and `node_modules`.
 *
 * Paths with white space are left out, because an `@` word ends at the
 * first space.
 */

import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

/** The chooser stays fast, and a huge tree does not stall the input. */
export const MAX_CANDIDATES = 5000;

const usable = function usable(file: string): boolean {
  return file !== "" && !/\s/u.test(file);
};

const gitFiles = async function gitFiles(cwd: string): Promise<string[] | null> {
  try {
    const git = Bun.spawn(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      cwd,
      stderr: "ignore",
      stdout: "pipe",
    });

    const [stdout, code] = await Promise.all([new Response(git.stdout).text(), git.exited]);

    return code === 0 ? stdout.split("\0") : null;
  } catch {
    // No git binary.
    return null;
  }
};

const readEntries = async function readEntries(cwd: string, dir: string): Promise<Dirent[]> {
  try {
    return await readdir(path.join(cwd, dir), { withFileTypes: true });
  } catch {
    return [];
  }
};

/** Reads one directory level at a time until the tree ends or the list is full. */
const walk = async function walk(
  cwd: string,
  dirs: readonly string[] = [""],
  files: readonly string[] = []
): Promise<string[]> {
  if (dirs.length === 0 || files.length >= MAX_CANDIDATES) {
    return [...files];
  }

  const levels = await Promise.all(
    dirs.map(async (dir) => ({ dir, entries: await readEntries(cwd, dir) }))
  );

  const nextDirs: string[] = [];
  const found = [...files];

  for (const { dir, entries } of levels) {
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }

      const relative = dir === "" ? entry.name : `${dir}/${entry.name}`;

      if (entry.isDirectory()) {
        nextDirs.push(relative);
      } else if (entry.isFile()) {
        found.push(relative);
      }
    }
  }

  return await walk(cwd, nextDirs, found);
};

export const listFileCandidates = async function listFileCandidates(
  cwd: string = process.cwd()
): Promise<string[]> {
  const files = (await gitFiles(cwd)) ?? (await walk(cwd));

  return [...new Set(files.filter(usable))].toSorted().slice(0, MAX_CANDIDATES);
};
