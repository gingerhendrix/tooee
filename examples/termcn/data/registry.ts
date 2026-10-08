/**
 * termcn registry parsing. The manifest at /r/registry.json lists Ink and
 * OpenTUI items of several types. The browser shows the OpenTUI UI items,
 * grouped by their first category in the order the termcn docs use.
 */

import {
  isJsonObject,
  jsonArrayField,
  jsonString,
  jsonStrings,
  parseJsonDocument,
} from "./json.js";
import type { JsonValue } from "./json.js";

export const TERMCN_ORIGIN = "https://www.termcn.dev";

export const REGISTRY_URL = `${TERMCN_ORIGIN}/r/registry.json`;

const OPENTUI_PREFIX = "opentui/";

/** Category order from the termcn docs sidebar; unknown categories sort after these. */
export const CATEGORY_ORDER = [
  "layout",
  "typography",
  "input",
  "selection",
  "data",
  "charts",
  "feedback",
  "navigation",
  "overlays",
  "forms",
  "utility",
  "ai",
  "templates",
  "core",
] as const;

export interface ComponentEntry {
  /** Short name without the `opentui/` prefix, for example `spinner`. */
  name: string;
  title: string;
  description: string;
  category: string;
  dependencies: string[];
  registryDependencies: string[];
}

/** Registry dependency URLs shortened to `opentui/use-theme` style names. */
export const shortRegistryDependency = function shortRegistryDependency(value: string): string {
  const match = /\/r\/(?<name>.+)\.json$/u.exec(value);

  return match?.groups?.name ?? value;
};

const toEntry = function toEntry(item: JsonValue): ComponentEntry | null {
  if (!isJsonObject(item)) {
    return null;
  }

  const name = jsonString(item.name, "");

  if (!name.startsWith(OPENTUI_PREFIX) || item.type !== "registry:ui") {
    return null;
  }

  const shortName = name.slice(OPENTUI_PREFIX.length);

  return {
    category: jsonStrings(item.categories)[0] ?? "other",
    dependencies: jsonStrings(item.dependencies),
    description: jsonString(item.description, ""),
    name: shortName,
    registryDependencies: jsonStrings(item.registryDependencies).map(shortRegistryDependency),
    title: jsonString(item.title, shortName),
  };
};

const CATEGORY_RANKS: ReadonlyMap<string, number> = new Map(
  CATEGORY_ORDER.map((category, index) => [category, index])
);

const categoryRank = function categoryRank(category: string): number {
  return CATEGORY_RANKS.get(category) ?? CATEGORY_ORDER.length;
};

/** Compare by category order, then title. */
export const compareEntries = function compareEntries(
  left: ComponentEntry,
  right: ComponentEntry
): number {
  return (
    categoryRank(left.category) - categoryRank(right.category) ||
    left.category.localeCompare(right.category) ||
    left.title.localeCompare(right.title)
  );
};

/** Parse registry.json text into sorted OpenTUI UI entries. */
export const parseRegistry = function parseRegistry(text: string): ComponentEntry[] {
  const items = jsonArrayField(parseJsonDocument(text), "items");

  if (items === null) {
    throw new TypeError("registry.json has no items array");
  }

  const entries = items.flatMap((item) => {
    const entry = toEntry(item);

    return entry === null ? [] : [entry];
  });

  return entries.toSorted(compareEntries);
};

/** Shell command that installs a component into a shadcn project. */
export const installCommand = function installCommand(entry: ComponentEntry): string {
  return `npx shadcn@latest add @termcn/opentui/${entry.name}`;
};
