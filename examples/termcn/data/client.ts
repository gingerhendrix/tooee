/**
 * termcn data client: the three documents the browser reads, each through
 * the disk cache. Errors stay typed so the UI can tell "offline" from "this
 * component has no docs page".
 */

import { createTextCache, FetchFailedError } from "./cache.js";
import type { CachedText, TextCache } from "./cache.js";
import { cleanDocsMarkdown, docsUrl, extractPreviewNames } from "./docs.js";
import { parseRegistry, REGISTRY_URL } from "./registry.js";
import type { ComponentEntry } from "./registry.js";
import { itemUrl, parseItemSource } from "./source.js";
import type { SourceFile } from "./source.js";

export interface Loaded<T> {
  value: T;
  /** True when the value came from an expired cache entry because the fetch failed. */
  stale: boolean;
}

export type DocsPage =
  | { kind: "page"; markdown: string; previews: string[] }
  | { kind: "missing"; reason: string };

export interface TermcnClient {
  readonly cacheDirectory: string;
  loadRegistry: () => Promise<Loaded<ComponentEntry[]>>;
  loadDocs: (entry: ComponentEntry) => Promise<Loaded<DocsPage>>;
  loadSource: (entry: ComponentEntry) => Promise<Loaded<SourceFile[]>>;
}

const loaded = function loaded<T>(value: T, text: CachedText): Loaded<T> {
  return { stale: text.origin === "stale", value };
};

export const createTermcnClient = function createTermcnClient(
  cache: TextCache = createTextCache()
): TermcnClient {
  const loadRegistry = async (): Promise<Loaded<ComponentEntry[]>> => {
    const text = await cache.get(REGISTRY_URL);

    return loaded(parseRegistry(text.text), text);
  };

  const loadDocs = async (entry: ComponentEntry): Promise<Loaded<DocsPage>> => {
    const url = docsUrl(entry);

    if (url === null) {
      return {
        stale: false,
        value: { kind: "missing", reason: "termcn has no docs page for core providers." },
      };
    }

    try {
      const text = await cache.get(url);

      const page: DocsPage = {
        kind: "page",
        markdown: cleanDocsMarkdown(text.text),
        previews: extractPreviewNames(text.text),
      };

      return loaded(page, text);
    } catch (error) {
      if (error instanceof FetchFailedError && error.status === 404) {
        return {
          stale: false,
          value: { kind: "missing", reason: `termcn.dev has no docs page at ${url}.` },
        };
      }

      throw error;
    }
  };

  const loadSource = async (entry: ComponentEntry): Promise<Loaded<SourceFile[]>> => {
    const text = await cache.get(itemUrl(entry.name));

    return loaded(parseItemSource(text.text), text);
  };

  return { cacheDirectory: cache.directory, loadDocs, loadRegistry, loadSource };
};
