/**
 * Pure import rewriting for the termcn vendor sync. termcn source imports
 * with the `@/` alias (rooted at `apps/web/`) and a few Ink hooks import
 * `ink`. The vendored copy must run without that alias or an Ink install, so
 * each specifier becomes a relative path inside `vendor/`.
 */

import path from "node:path";

/** Specifiers replaced by small local shims instead of copied source. */
export const SHIMMED_SPECIFIERS: ReadonlyMap<string, string> = new Map([
  ["@/registry/bases", "shims/bases.ts"],
  ["ink", "shims/ink.ts"],
]);

const SPECIFIER_PATTERN =
  /(?<lead>\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(?<quote>["'])(?<specifier>[^"']+)\k<quote>/gu;

/** Vendor-relative target for an alias or shim specifier, or null to leave it alone. */
export const vendorTarget = function vendorTarget(specifier: string): string | null {
  const shim = SHIMMED_SPECIFIERS.get(specifier);

  if (shim !== undefined) {
    return shim;
  }

  if (specifier.startsWith("@/")) {
    return specifier.slice(2);
  }

  return null;
};

/** Relative import path from one vendor file to another vendor path. */
export const relativeSpecifier = function relativeSpecifier(
  fromFile: string,
  toPath: string
): string {
  const relative = path.posix.relative(path.posix.dirname(fromFile), toPath);

  return relative.startsWith(".") ? relative : `./${relative}`;
};

export interface RewriteResult {
  content: string;
  /** Vendor-relative targets of every rewritten `@/` alias (shims excluded). */
  aliasTargets: string[];
}

/**
 * Rewrite `@/…` and shimmed specifiers in one file.
 *
 * @param content - Source text.
 * @param file - The file's path relative to `vendor/` (posix separators).
 */
export const rewriteImports = function rewriteImports(
  content: string,
  file: string
): RewriteResult {
  const aliasTargets: string[] = [];

  const rewritten = content.replaceAll(
    SPECIFIER_PATTERN,
    (whole: string, lead: string, quote: string, specifier: string) => {
      const target = vendorTarget(specifier);

      if (target === null) {
        return whole;
      }

      if (!SHIMMED_SPECIFIERS.has(specifier)) {
        aliasTargets.push(target);
      }

      return `${lead}${quote}${relativeSpecifier(file, target)}${quote}`;
    }
  );

  return { aliasTargets, content: rewritten };
};
