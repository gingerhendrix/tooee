import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { firstMarkdownLink, resolveMarkdownLink } from "../src/markdown-links.js";

let root: string;
let current: string;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "tooee-links-"));
  current = path.join(root, "current.md");
  writeFileSync(current, "# Current");
  writeFileSync(path.join(root, "a b.md"), "# Target");
  mkdirSync(path.join(root, "directory"));
});
afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

test("resolves relative, absolute and file URLs, including fragments", () => {
  const target = path.join(root, "a b.md");
  for (const href of ["./a%20b.md", target, pathToFileURL(target).href, "a%20b.md#heading"]) {
    expect(resolveMarkdownLink(href, root, current)).toEqual({ path: target, status: "file" });
  }
  expect(resolveMarkdownLink("#heading", root, current)).toEqual({ path: current, status: "file" });
});

test.each([
  "",
  "https://example.com",
  "http://example.com",
  "mailto:a@b.com",
  "ftp://host/a",
  "//host/file",
  "file://host/tmp/a",
  "file://localhost/tmp/a",
  "file:current.md",
  "current.md?",
  "current.md?query",
  "current.md#%ZZ",
  "%ZZ",
  "current.md\n",
  "%00",
  "%7f",
  "%C2%85",
  "a%5cb.md",
  "a\\b.md",
  "file:///tmp/a?query",
])("leaves invalid or unsupported target unhandled: %s", (href) => {
  expect(resolveMarkdownLink(href, root, current)).toEqual({ status: "unsupported" });
});

test("finds the first ordinary link while skipping images and code", () => {
  expect(
    firstMarkdownLink('![image](image.png) **[First](<a b.md> "title")** [Second](next.md)'),
  ).toBe("a b.md");
  expect(firstMarkdownLink("`[code](code.md)` ![image](image.png) [Real](a(b).md)")).toBe(
    "a(b).md",
  );
  expect(firstMarkdownLink("![image](image.png)")).toBeNull();
});

test("distinguishes missing files from directories", () => {
  expect(resolveMarkdownLink("missing.md", root)).toEqual({
    path: path.join(root, "missing.md"),
    status: "missing",
  });
  expect(resolveMarkdownLink("directory", root)).toEqual({
    path: path.join(root, "directory"),
    status: "directory",
  });
});
