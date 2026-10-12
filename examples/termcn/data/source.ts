/**
 * termcn registry items. /r/opentui/<name>.json holds the component source
 * in `files[].content`, with the path the shadcn CLI writes it to.
 */

import {
  isJsonObject,
  isJsonString,
  jsonArrayField,
  jsonString,
  parseJsonDocument,
} from "./json.js";
import type { JsonObject } from "./json.js";
import { TERMCN_ORIGIN } from "./registry.js";

export interface SourceFile {
  /** Install target, for example `components/ui/spinner.tsx`. */
  target: string;
  content: string;
  language: string;
}

export const itemUrl = function itemUrl(name: string): string {
  return `${TERMCN_ORIGIN}/r/opentui/${name}.json`;
};

/** Syntax language for a file name, by extension. */
export const languageFor = function languageFor(file: string): string {
  if (file.endsWith(".tsx")) {
    return "tsx";
  }

  if (file.endsWith(".ts")) {
    return "typescript";
  }

  return file.endsWith(".json") ? "json" : "text";
};

const fileTarget = function fileTarget(file: JsonObject): string {
  if (isJsonString(file.target)) {
    return file.target;
  }

  return jsonString(file.path, "file");
};

/** Parse a registry item into its source files. */
export const parseItemSource = function parseItemSource(text: string): SourceFile[] {
  const files = jsonArrayField(parseJsonDocument(text), "files");

  if (files === null) {
    throw new TypeError("registry item has no files array");
  }

  return files.flatMap((file) => {
    if (!isJsonObject(file) || !isJsonString(file.content)) {
      return [];
    }

    const target = fileTarget(file);

    return [{ content: file.content, language: languageFor(target), target }];
  });
};
