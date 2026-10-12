/**
 * Disk-cached HTTP text fetches. A fresh cache entry is used without a
 * request. A stale entry is refreshed, and kept as a fallback when the
 * network fails, so the browser still works offline after one online run.
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface FetchedText {
  status: number;
  text: string;
}

/** Fetch a URL. Rejects only for network failures; HTTP errors come back as a status. */
export type FetchText = (url: string) => Promise<FetchedText>;

export interface CachedText {
  text: string;
  /** "network" for a new fetch, "cache" for a fresh entry, "stale" for an offline fallback. */
  origin: "network" | "cache" | "stale";
}

export interface TextCache {
  readonly directory: string;
  get: (url: string) => Promise<CachedText>;
}

export class FetchFailedError extends Error {
  readonly url: string;
  /** HTTP status when the server answered, null for network failures. */
  readonly status: number | null;

  constructor(url: string, status: number | null, reason: string, directory: string) {
    super(
      status === null
        ? `Could not fetch ${url} (${reason}). No cached copy exists in ${directory}. ` +
            "Check the network connection and press r to retry."
        : `termcn.dev answered ${url} with HTTP ${status}.`
    );
    this.name = "FetchFailedError";
    this.url = url;
    this.status = status;
  }
}

/** Cache folder: $TOOEE_TERMCN_CACHE, else $XDG_CACHE_HOME/tooee-termcn, else ~/.cache/tooee-termcn. */
export const defaultCacheDirectory = function defaultCacheDirectory(
  env: Record<string, string | undefined> = process.env
): string {
  const override = env.TOOEE_TERMCN_CACHE;

  if (override !== undefined && override !== "") {
    return override;
  }

  const xdg = env.XDG_CACHE_HOME;
  const base = xdg !== undefined && xdg !== "" ? xdg : path.join(homedir(), ".cache");

  return path.join(base, "tooee-termcn");
};

/** File name for a URL: host and path with unsafe characters replaced. */
export const cacheFileName = function cacheFileName(url: string): string {
  const { host, pathname } = new URL(url);

  return `${host}${pathname}`.replaceAll(/[^a-zA-Z0-9._-]+/gu, "_");
};

export const fetchTextFromNetwork: FetchText = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const text = await response.text();

  return { status: response.status, text };
};

const readEntry = async function readEntry(
  file: string
): Promise<{ text: string; ageMs: number } | null> {
  try {
    const info = await stat(file);

    return { ageMs: Date.now() - info.mtimeMs, text: await readFile(file, "utf-8") };
  } catch {
    return null;
  }
};

export interface CreateTextCacheOptions {
  directory?: string;
  fetchText?: FetchText;
  maxAgeMs?: number;
}

export const createTextCache = function createTextCache(
  options: CreateTextCacheOptions = {}
): TextCache {
  const directory = options.directory ?? defaultCacheDirectory();
  const fetchText = options.fetchText ?? fetchTextFromNetwork;
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;

  const get = async (url: string): Promise<CachedText> => {
    const file = path.join(directory, cacheFileName(url));
    const entry = await readEntry(file);

    if (entry !== null && entry.ageMs < maxAgeMs) {
      return { origin: "cache", text: entry.text };
    }

    let fetched: FetchedText | null = null;
    let reason = "";

    try {
      fetched = await fetchText(url);
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }

    if (fetched?.status === 200) {
      await mkdir(directory, { recursive: true });
      await writeFile(file, fetched.text);

      return { origin: "network", text: fetched.text };
    }

    // A stale copy beats a network or server failure, but not a 404.
    if (entry !== null && (fetched === null || fetched.status >= 500)) {
      return { origin: "stale", text: entry.text };
    }

    throw new FetchFailedError(url, fetched?.status ?? null, reason, directory);
  };

  return { directory, get };
};
