import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react],
  // Tool configs are validated by Ultracite Doctor and their own CLIs. Type-aware
  // lint cannot resolve Oxfmt's config-only type surface through the repo projects.
  // The documentation site is an independent Bun project checked by its own CI step.
  // The vendored anti-slop detector implementation is third-party code held byte-identical
  // to the StreamOS copy; local policy applies to Tooee code, not to the detectors.
  ignorePatterns: [
    ...core.ignorePatterns,
    "oxlint.config.ts",
    "oxfmt.config.ts",
    "site/**",
    "tools/oxlint/anti-slop/**",
  ],
  jsPlugins: [{ name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" }],
  options: {
    typeAware: true,
  },
  overrides: [
    {
      files: ["packages/renderers/src/row-document-renderable.ts"],
      rules: {
        "no-underscore-dangle": "off",
      },
    },
  ],
  rules: {
    // The Wave 3 sweep is closed: every rule below is enforced repository-wide.
    // The only exceptions are the two policy entries at the end of this block.
    complexity: "error",
    "no-bitwise": "error",
    "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
    "prefer-destructuring": "error",
    "typescript/ban-types": "error",
    "typescript/consistent-type-definitions": "error",
    "typescript/no-base-to-string": "error",
    "typescript/no-deprecated": "error",
    "typescript/no-empty-object-type": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-invalid-void-type": "error",
    "typescript/no-redundant-type-constituents": "error",
    "typescript/no-unnecessary-type-parameters": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/parameter-properties": "error",
    "typescript/prefer-readonly": "error",
    "typescript/restrict-template-expressions": "error",
    "unicorn/consistent-existence-index-check": "error",
    "unicorn/import-style": "error",
    "unicorn/no-array-for-each": "error",
    "unicorn/no-array-method-this-argument": "error",
    "unicorn/no-array-sort": "error",
    "unicorn/no-immediate-mutation": "error",
    "unicorn/prefer-at": "error",
    "unicorn/prefer-code-point": "error",
    "unicorn/prefer-export-from": "error",
    "unicorn/prefer-number-coercion": "error",
    "unicorn/prefer-single-call": "error",
    "unicorn/prefer-spread": "error",
    // Anti-slop custom policy (vendored plugin under tools/oxlint/anti-slop). The adoption
    // sweep is closed: all 336 findings are gone and every rule is an error, so the per-rule
    // debt ratchet that held the remaining warnings has been removed. The router keeps a small
    // set of local exceptions where an unparsed value is the public contract; each one names
    // its rule and its reason next to the code, and `packages/router/src/types.ts` records why
    // that boundary stays `unknown`.
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-react-global-namespace": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
    // Permanently off (policy). Tooee renders to a terminal, not the DOM: there is no
    // accessibility tree and no ARIA. `CommandSurfaceProvider.role` is a Tooee command-surface
    // role ("modal" | "passive"), and the rule can only ever produce false positives here.
    "jsx-a11y/aria-role": "off",
    // Tooee does not use React Compiler, so compiler-adoption guidance is not applicable.
    "react/react-compiler": "off",
  },
});
