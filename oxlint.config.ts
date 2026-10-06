import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react],
  // Tool configs are validated by Ultracite Doctor and their own CLIs. Type-aware
  // lint cannot resolve Oxfmt's config-only type surface through the repo projects.
  // The documentation site is an independent Bun project checked by its own CI step.
  // The vendored plugins under tools/oxlint are copies from the oxlint-rules repository and
  // must stay byte-identical to it; local policy applies to Tooee code, not to the detectors.
  ignorePatterns: [
    ...core.ignorePatterns,
    "oxlint.config.ts",
    "oxfmt.config.ts",
    "site/**",
    "tools/oxlint/anti-slop/**",
    "tools/oxlint/react-idioms/**",
  ],
  jsPlugins: [
    { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
    { name: "react-idioms", specifier: "./tools/oxlint/react-idioms/index.ts" },
  ],
  options: {
    // A disable comment that no longer suppresses anything fails the gate, so stale
    // exceptions cannot accumulate after rule or code changes.
    reportUnusedDisableDirectives: "error",
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
    "typescript/no-generated-empty-object-type": "error",
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
    // Anti-slop custom policy (vendored plugin under tools/oxlint/anti-slop, upstream c44ef22).
    // Every generic rule is an error and no debt ratchet remains. About 36 local exceptions
    // remain across the packages and examples, mostly at decode and runtime-type boundaries.
    // Each one names its rule and its reason next to the code. The router holds the largest
    // group, and `packages/router/src/types.ts` records why its boundary stays `unknown`.
    // The Effect rules under effect/ stay off: Tooee has no `effect` dependency.
    "anti-slop/no-array-filter-map": "error",
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reduce-accumulator-copy": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-readable-spacing": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
    // Vendored react-idioms plugin (tools/oxlint/react-idioms). This rule started in Tooee's
    // anti-slop copy and now lives in the oxlint-rules repository.
    "react-idioms/no-react-global-namespace": "error",
    // Permanently off (policy). Tooee renders to a terminal, not the DOM: there is no
    // accessibility tree and no ARIA. `CommandSurfaceProvider.role` is a Tooee command-surface
    // role ("modal" | "passive"), and the rule can only ever produce false positives here.
    "jsx-a11y/aria-role": "off",
    // Tooee does not use React Compiler, so compiler-adoption guidance is not applicable.
    // Oxlint 1.79 split the former `react/react-compiler` rule into these categories.
    "react/capitalized-calls": "off",
    "react/error-boundaries": "off",
    "react/exhaustive-effect-dependencies": "off",
    "react/globals": "off",
    "react/hooks": "off",
    "react/immutability": "off",
    "react/incompatible-library": "off",
    "react/invariant": "off",
    "react/memo-dependencies": "off",
    "react/no-deriving-state-in-effects": "off",
    "react/preserve-manual-memoization": "off",
    "react/purity": "off",
    "react/refs": "off",
    "react/rule-suppression": "off",
    "react/set-state-in-effect": "off",
    "react/set-state-in-render": "off",
    "react/static-components": "off",
    "react/syntax": "off",
    "react/todo": "off",
    "react/unsupported-syntax": "off",
    "react/use-memo": "off",
    "react/void-use-memo": "off",
    // Components are named function expressions (`const View = function View() {}`), which
    // keep a stable display name and match the rest of the codebase.
    "react/function-component-definition": ["error", { namedComponents: "function-expression" }],
  },
});
