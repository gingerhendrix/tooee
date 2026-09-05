import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

function hasReactImportBinding(program: ESTree.Program): boolean {
  return program.body.some(
    (statement) =>
      statement.type === "ImportDeclaration" &&
      statement.specifiers.some((specifier) => specifier.local.name === "React"),
  );
}

/** Require an explicit React import before using the React type namespace. */
export const noReactGlobalNamespaceRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow React-qualified types that rely on the ambient UMD namespace when no React import binding exists.",
    },
    messages: {
      globalNamespace:
        "Import this type explicitly from react instead of relying on the ambient React namespace.",
    },
  },
  createOnce(context) {
    let hasReactImport = false;

    return {
      Program(node) {
        hasReactImport = hasReactImportBinding(node);
      },
      TSQualifiedName(node) {
        if (
          !hasReactImport &&
          node.left.type === "Identifier" &&
          node.left.name === "React"
        ) {
          context.report({ node, messageId: "globalNamespace" });
        }
      },
    };
  },
});
