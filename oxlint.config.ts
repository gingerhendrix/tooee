import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react],
  // Tool configs are validated by Ultracite Doctor and their own CLIs. Type-aware
  // lint cannot resolve Oxfmt's config-only type surface through the repo projects.
  ignorePatterns: [...core.ignorePatterns, "oxlint.config.ts", "oxfmt.config.ts"],
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
    // Permanently off (policy). Tooee renders to a terminal, not the DOM: there is no
    // accessibility tree and no ARIA. `CommandSurfaceProvider.role` is a Tooee command-surface
    // role ("modal" | "passive"), and the rule can only ever produce false positives here.
    "jsx-a11y/aria-role": "off",
    // Tooee does not use React Compiler, so compiler-adoption guidance is not applicable.
    "react/react-compiler": "off",
  },
});
