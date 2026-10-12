import { describe, expect, test } from "bun:test";
import { readFile, utimes } from "node:fs/promises";
import path from "node:path";

import {
  cacheFileName,
  createTextCache,
  defaultCacheDirectory,
  FetchFailedError,
} from "../../data/cache.js";
import type { FetchText } from "../../data/cache.js";
import { captureError, offlineFetch, tempCacheDirectory } from "../support/fake-termcn.js";

const URL_A = "https://www.termcn.dev/r/registry.json";

interface CountingFetch {
  fetchText: FetchText;
  calls: string[];
}

const notFoundFetch: FetchText = async () => {
  await Promise.resolve();

  return { status: 404, text: "Not found" };
};

const countingFetch = function countingFetch(text: string): CountingFetch {
  const calls: string[] = [];

  const fetchText: FetchText = async (url) => {
    await Promise.resolve();
    calls.push(url);

    return { status: 200, text };
  };

  return { calls, fetchText };
};

describe("createTextCache", () => {
  test("fetches once, then serves the fresh copy from disk", async () => {
    const directory = await tempCacheDirectory();
    const { calls, fetchText } = countingFetch("first");
    const cache = createTextCache({ directory, fetchText });

    expect(await cache.get(URL_A)).toEqual({ origin: "network", text: "first" });
    expect(await cache.get(URL_A)).toEqual({ origin: "cache", text: "first" });
    expect(calls).toEqual([URL_A]);
    expect(await readFile(path.join(directory, cacheFileName(URL_A)), "utf-8")).toBe("first");
  });

  test("refreshes an expired entry", async () => {
    const directory = await tempCacheDirectory();

    await createTextCache({ directory, fetchText: countingFetch("old").fetchText }).get(URL_A);
    await utimes(path.join(directory, cacheFileName(URL_A)), new Date(0), new Date(0));

    const result = await createTextCache({
      directory,
      fetchText: countingFetch("new").fetchText,
    }).get(URL_A);

    expect(result).toEqual({ origin: "network", text: "new" });
  });

  test("falls back to an expired entry when offline", async () => {
    const directory = await tempCacheDirectory();

    await createTextCache({ directory, fetchText: countingFetch("kept").fetchText }).get(URL_A);
    await utimes(path.join(directory, cacheFileName(URL_A)), new Date(0), new Date(0));

    const result = await createTextCache({ directory, fetchText: offlineFetch }).get(URL_A);

    expect(result).toEqual({ origin: "stale", text: "kept" });
  });

  test("explains an offline miss and names the cache folder", async () => {
    const directory = await tempCacheDirectory();

    const error = await captureError(
      createTextCache({ directory, fetchText: offlineFetch }).get(URL_A)
    );

    expect(error).toBeInstanceOf(FetchFailedError);
    expect(error?.message).toContain(`No cached copy exists in ${directory}`);
    expect(error?.message).toContain("ENOTFOUND");
  });

  test("reports an HTTP status without caching it", async () => {
    const directory = await tempCacheDirectory();

    const error = await captureError(
      createTextCache({ directory, fetchText: notFoundFetch }).get(URL_A)
    );

    expect(error instanceof FetchFailedError ? error.status : null).toBe(404);
  });
});

describe("cache paths", () => {
  test("honours TOOEE_TERMCN_CACHE, then XDG_CACHE_HOME", () => {
    expect(defaultCacheDirectory({ TOOEE_TERMCN_CACHE: "/tmp/x" })).toBe("/tmp/x");
    expect(defaultCacheDirectory({ XDG_CACHE_HOME: "/tmp/xdg" })).toBe("/tmp/xdg/tooee-termcn");
  });

  test("turns a URL into a flat file name", () => {
    expect(cacheFileName("https://www.termcn.dev/r/opentui/box.json")).toBe(
      "www.termcn.dev_r_opentui_box.json"
    );
  });
});
