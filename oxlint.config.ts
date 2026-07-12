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
    // Rule gate: rules with findings at the migration baseline are disabled.
    // All other Ultracite rules remain enabled, so any newly failing rule blocks the gate.
    complexity: "off",
    eqeqeq: "off",
    "no-bitwise": "off",
    "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
    "no-empty": "off",
    "no-empty-function": "off",
    "no-eq-null": "off",
    "no-negated-condition": "off",
    "no-nested-ternary": "off",
    "prefer-destructuring": "off",
    "prefer-named-capture-group": "off",
    "promise/avoid-new": "off",
    "promise/param-names": "off",
    "promise/prefer-await-to-callbacks": "off",
    "promise/prefer-await-to-then": "off",
    "react/hook-use-state": "off",
    "react/jsx-handler-names": "off",
    "typescript/await-thenable": "off",
    "typescript/ban-types": "off",
    "typescript/consistent-return": "off",
    "typescript/consistent-type-definitions": "off",
    "typescript/no-base-to-string": "off",
    "typescript/no-deprecated": "off",
    "typescript/no-empty-object-type": "off",
    "typescript/no-explicit-any": "off",
    "typescript/no-invalid-void-type": "off",
    "typescript/no-redundant-type-constituents": "off",
    "typescript/no-unnecessary-type-parameters": "off",
    "typescript/no-unsafe-argument": "off",
    "typescript/no-unsafe-assignment": "off",
    "typescript/no-unsafe-call": "off",
    "typescript/no-unsafe-member-access": "off",
    "typescript/no-unsafe-return": "off",
    "typescript/parameter-properties": "off",
    "typescript/prefer-nullish-coalescing": "off",
    "typescript/prefer-readonly": "off",
    "typescript/prefer-regexp-exec": "off",
    "typescript/restrict-template-expressions": "off",
    "typescript/return-await": "off",
    "unicorn/consistent-existence-index-check": "off",
    "unicorn/import-style": "off",
    "unicorn/no-array-for-each": "off",
    "unicorn/no-array-method-this-argument": "off",
    "unicorn/no-array-sort": "off",
    "unicorn/no-immediate-mutation": "off",
    "unicorn/no-negated-condition": "off",
    "unicorn/no-nested-ternary": "off",
    "unicorn/prefer-at": "off",
    "unicorn/prefer-code-point": "off",
    "unicorn/prefer-export-from": "off",
    "unicorn/prefer-number-coercion": "off",
    "unicorn/prefer-regexp-test": "off",
    "unicorn/prefer-single-call": "off",
    "unicorn/prefer-spread": "off",
    // Tooee does not use React Compiler, so compiler-adoption guidance is not applicable.
    "react/react-compiler": "off",
    "jsx-a11y/aria-role": "off",
  },
});
