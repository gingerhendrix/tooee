/**
 * Recognize and read SVG image sources: file paths, `file:` and `http(s):`
 * URLs whose path ends in `.svg`, and `data:image/svg+xml` URIs.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SVG_DATA_URI = /^data:image\/svg\+xml[;,]/iu;

const SVG_EXTENSION = /\.svg$/iu;

/** Two or more letters, so a Windows drive such as `C:` is not a scheme. */
const URL_SCHEME = /^[a-z][a-z\d+.-]+:/iu;

const READABLE_URL = /^(?:https?|file):/iu;

const urlPath = function urlPath(source: string): string | null {
  try {
    return new URL(source).pathname;
  } catch {
    return null;
  }
};

/** True for a source that `readSvgSource` reads as SVG. */
export const isSvgSource = function isSvgSource(source: string): boolean {
  if (SVG_DATA_URI.test(source)) {
    return true;
  }

  if (READABLE_URL.test(source)) {
    const pathname = urlPath(source);

    return pathname !== null && SVG_EXTENSION.test(pathname);
  }

  if (URL_SCHEME.test(source)) {
    return false;
  }

  return SVG_EXTENSION.test(source);
};

/** Decode the payload of a `data:image/svg+xml` URI. */
export const decodeSvgDataUri = function decodeSvgDataUri(source: string): string {
  const comma = source.indexOf(",");

  if (comma === -1) {
    throw new Error("SVG data URI has no payload");
  }

  const header = source.slice(0, comma);
  const payload = source.slice(comma + 1);

  if (/;base64$/iu.test(header)) {
    return Buffer.from(payload, "base64").toString("utf-8");
  }

  return decodeURIComponent(payload);
};

export interface ReadSvgOptions {
  signal?: AbortSignal;
  /** Fetch for `http(s):` sources. Default: the global `fetch`. */
  fetch?: (input: string, init?: RequestInit) => Promise<Response>;
}

/** Read the SVG text of `source`. Rejects when the source cannot be read. */
export const readSvgSource = async function readSvgSource(
  source: string,
  options: ReadSvgOptions = {}
): Promise<string> {
  if (SVG_DATA_URI.test(source)) {
    return decodeSvgDataUri(source);
  }

  if (/^https?:/iu.test(source)) {
    const fetchSvg = options.fetch ?? fetch;
    const response = await fetchSvg(source, { signal: options.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${source}`);
    }

    return await response.text();
  }

  const filePath = /^file:/iu.test(source) ? fileURLToPath(source) : source;

  return await readFile(filePath, { encoding: "utf-8", signal: options.signal });
};
