/** In-memory termcn.dev for tests: a small registry, one docs page, and one item. */

import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createTextCache } from "../../data/cache.js";
import type { FetchText } from "../../data/cache.js";
import { createTermcnClient } from "../../data/client.js";
import type { TermcnClient } from "../../data/client.js";
import { REGISTRY_URL, TERMCN_ORIGIN } from "../../data/registry.js";

export const FIXTURE_VENDOR_DIR = path.join(import.meta.dir, "..", "fixtures", "vendor");

export const FIXTURE_REGISTRY = JSON.stringify({
  items: [
    {
      categories: ["layout"],
      dependencies: ["@opentui/react"],
      description: "Flexbox container",
      name: "opentui/box",
      registryDependencies: ["https://termcn.dev/r/opentui/use-theme.json"],
      title: "Box",
      type: "registry:ui",
    },
    {
      categories: ["feedback"],
      dependencies: ["@opentui/react"],
      description: "Prints the keys it receives",
      name: "opentui/key-echo",
      title: "Key Echo",
      type: "registry:ui",
    },
    { categories: ["layout"], name: "ink/box", title: "Box", type: "registry:ui" },
    { categories: ["core"], name: "opentui/types", title: "Types", type: "registry:file" },
  ],
});

export const FIXTURE_DOCS = [
  "# Key Echo",
  "",
  "Prints the keys it receives",
  "",
  '<ComponentPreview base="opentui" name="key-echo-demo" />',
  "",
  "Usage [#usage]",
  "",
  "```tsx",
  "<KeyEcho />",
  "```",
].join("\n");

export const FIXTURE_ITEM = JSON.stringify({
  files: [
    {
      content: "export const KeyEcho = () => null;\n",
      path: "registry/opentui/ui/key-echo.tsx",
      target: "components/ui/key-echo.tsx",
    },
  ],
  name: "opentui/key-echo",
});

export const FIXTURE_PAGES: ReadonlyMap<string, string> = new Map([
  [REGISTRY_URL, FIXTURE_REGISTRY],
  [`${TERMCN_ORIGIN}/docs/components/opentui/feedback/key-echo.md`, FIXTURE_DOCS],
  [`${TERMCN_ORIGIN}/r/opentui/key-echo.json`, FIXTURE_ITEM],
]);

/** Serve FIXTURE_PAGES; any other URL answers 404. */
export const fixtureFetch: FetchText = async (url) => {
  await Promise.resolve();

  const text = FIXTURE_PAGES.get(url);

  return text === undefined ? { status: 404, text: "" } : { status: 200, text };
};

export const offlineFetch: FetchText = async () => {
  await Promise.resolve();

  throw new Error("getaddrinfo ENOTFOUND www.termcn.dev");
};

export const tempCacheDirectory = async function tempCacheDirectory(): Promise<string> {
  return await mkdtemp(path.join(tmpdir(), "tooee-termcn-test-"));
};

export const createFixtureClient = async function createFixtureClient(
  fetchText: FetchText = fixtureFetch
): Promise<TermcnClient> {
  return createTermcnClient(createTextCache({ directory: await tempCacheDirectory(), fetchText }));
};

/** The error a promise rejects with, or null when it resolves. */
export const captureError = async function captureError<T>(
  promise: Promise<T>
): Promise<Error | null> {
  try {
    await promise;

    return null;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
};
