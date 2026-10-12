/**
 * Runtime access to the vendored termcn source in examples/termcn/vendor/.
 * The folder is git-ignored and created by the sync script, so every access
 * here is dynamic and tolerates a missing folder.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { ComponentType, ReactNode } from "react";

import { isJsonObject, jsonString, parseJsonDocument } from "../data/json.js";
import type { TermcnTheme } from "./theme-bridge.js";

export const VENDOR_DIR = path.join(import.meta.dir, "..", "vendor");

export const SYNC_COMMAND = "bun examples/termcn/scripts/sync-vendor.ts";

export type VendorStatus =
  | { available: true; commit: string; demos: string[] }
  | { available: false; directory: string };

/** Read VENDORED.json and the demo list. A missing or broken folder reads as unavailable. */
export const readVendorStatus = async function readVendorStatus(
  directory: string = VENDOR_DIR
): Promise<VendorStatus> {
  try {
    const manifest = parseJsonDocument(
      await readFile(path.join(directory, "VENDORED.json"), "utf-8")
    );

    const files = await readdir(path.join(directory, "examples", "opentui"));

    const demos = files
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => file.slice(0, -".tsx".length))
      .toSorted();

    const commit = isJsonObject(manifest) ? jsonString(manifest.commit, "unknown") : "unknown";

    return { available: true, commit, demos };
  } catch {
    return { available: false, directory };
  }
};

/** The default export of a module, or its first function export (termcn demos use both). */
const pickComponent = function pickComponent(
  exports: Record<string, ComponentType | undefined>,
  file: string
): ComponentType {
  const component = exports.default ?? Object.values(exports).find((value) => value !== undefined);

  if (component === undefined) {
    throw new Error(`${file} exports no component`);
  }

  return component;
};

const importComponents = async function importComponents(
  file: string
): Promise<Record<string, ComponentType | undefined>> {
  const exports: unknown = await import(file);

  // SAFETY: vendor files are termcn demo and provider modules, whose exports
  // are React components (plus types, which do not exist at runtime).
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- dynamic import of vendored component modules
  return exports as Record<string, ComponentType | undefined>;
};

/** Import one demo component by name. */
export const loadDemo = async function loadDemo(
  name: string,
  directory: string = VENDOR_DIR
): Promise<ComponentType> {
  const file = path.join(directory, "examples", "opentui", `${name}.tsx`);

  return pickComponent(await importComponents(file), file);
};

export type TermcnThemeProvider = ComponentType<{ theme: TermcnTheme; children?: ReactNode }>;

/** Import termcn's ThemeProvider from vendor/. */
export const loadThemeProvider = async function loadThemeProvider(
  directory: string = VENDOR_DIR
): Promise<TermcnThemeProvider> {
  const file = path.join(
    directory,
    "registry",
    "bases",
    "opentui",
    "providers",
    "theme-provider.tsx"
  );

  const exports = await importComponents(file);
  const provider = exports.ThemeProvider;

  if (provider === undefined) {
    throw new Error(`${file} has no ThemeProvider export`);
  }

  // SAFETY: termcn's ThemeProvider takes `{ theme?: Theme; children }`, and
  // TermcnTheme mirrors termcn's Theme token shape.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- vendored provider props are mirrored by TermcnTheme
  return provider as TermcnThemeProvider;
};
