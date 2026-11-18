import { describe, expect, test } from "bun:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { decodeSvgDataUri, isSvgSource, readSvgSource } from "../src/source.js";

const BADGE = path.join(import.meta.dir, "fixtures", "badge.svg");

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="2"/>';

describe("isSvgSource", () => {
  test.each([
    "diagram.svg",
    "/abs/Diagram.SVG",
    "C:\\images\\diagram.svg",
    "file:///tmp/diagram.svg",
    "https://example.com/logo.svg?v=2#top",
    "data:image/svg+xml;base64,PHN2Zy8+",
    "data:image/svg+xml,%3Csvg%2F%3E",
    "DATA:IMAGE/SVG+XML;charset=utf-8,%3Csvg%2F%3E",
  ])("matches %s", (source) => {
    expect(isSvgSource(source)).toBe(true);
  });

  test.each([
    "diagram.png",
    "diagram.svg.png",
    "https://example.com/logo.png?file=a.svg",
    "data:image/png;base64,AAAA",
    "ftp://example.com/logo.svg",
    "",
  ])("rejects %s", (source) => {
    expect(isSvgSource(source)).toBe(false);
  });
});

describe("decodeSvgDataUri", () => {
  test("decodes base64 payloads", () => {
    const uri = `data:image/svg+xml;base64,${Buffer.from(SVG).toString("base64")}`;

    expect(decodeSvgDataUri(uri)).toBe(SVG);
  });

  test("decodes percent-encoded payloads", () => {
    expect(decodeSvgDataUri(`data:image/svg+xml,${encodeURIComponent(SVG)}`)).toBe(SVG);
  });

  test("rejects a URI with no payload", () => {
    expect(() => decodeSvgDataUri("data:image/svg+xml")).toThrow("no payload");
  });
});

describe("readSvgSource", () => {
  test("reads a file path and a file URL", async () => {
    const text = await readSvgSource(BADGE);

    expect(text).toContain("<svg");
    expect(await readSvgSource(pathToFileURL(BADGE).href)).toBe(text);
  });

  test("fetches http sources with the given fetch", async () => {
    const requested: string[] = [];

    const text = await readSvgSource("https://example.com/a.svg", {
      fetch: async (input) => {
        requested.push(input);
        await Promise.resolve();

        return new Response(SVG);
      },
    });

    expect(text).toBe(SVG);
    expect(requested).toEqual(["https://example.com/a.svg"]);
  });

  test("rejects an http error status", async () => {
    let message = "resolved";

    try {
      await readSvgSource("https://example.com/missing.svg", {
        fetch: async () => {
          await Promise.resolve();

          return new Response("gone", { status: 404 });
        },
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("HTTP 404");
  });
});
