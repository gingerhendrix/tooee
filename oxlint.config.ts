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
    // Option C residual gate: these entries remain disabled only for the exact
    // implementation/public-contract sites recorded in the lint sweep report.
    complexity: "error",
    "no-bitwise": "off",
    "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
    "prefer-destructuring": "off",
    "typescript/ban-types": "error",
    "typescript/consistent-type-definitions": "off",
    "typescript/no-base-to-string": "error",
    "typescript/no-deprecated": "off",
    "typescript/no-empty-object-type": "off",
    "typescript/no-explicit-any": "off",
    "typescript/no-invalid-void-type": "off",
    "typescript/no-redundant-type-constituents": "off",
    "typescript/no-unnecessary-type-parameters": "off",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "off",
    "typescript/no-unsafe-member-access": "off",
    "typescript/no-unsafe-return": "error",
    "typescript/parameter-properties": "error",
    "typescript/prefer-readonly": "error",
    "typescript/restrict-template-expressions": "off",
    "unicorn/consistent-existence-index-check": "error",
    "unicorn/import-style": "error",
    "unicorn/no-array-for-each": "error",
    "unicorn/no-array-method-this-argument": "error",
    "unicorn/no-array-sort": "error",
    "unicorn/no-immediate-mutation": "off",
    "unicorn/prefer-at": "off",
    "unicorn/prefer-code-point": "error",
    "unicorn/prefer-export-from": "error",
    "unicorn/prefer-number-coercion": "error",
    "unicorn/prefer-single-call": "error",
    "unicorn/prefer-spread": "error",
    // CommandSurfaceProvider's `role` is an internal surface role, not a DOM ARIA role.
    // Keep the honest findings visible until the public prop is renamed or lint is scoped.
    "jsx-a11y/aria-role": "off",
    // Tooee does not use React Compiler, so compiler-adoption guidance is not applicable.
    "react/react-compiler": "off",
  },
});
