import { eslintCompatPlugin } from "@oxlint/plugins";

import { noReactGlobalNamespaceRule } from "./rules/no-react-global-namespace.ts";

/** Oxlint rules for React code in Personal repositories. */
const reactIdiomsPlugin = eslintCompatPlugin({
  meta: { name: "react-idioms" },
  rules: {
    "no-react-global-namespace": noReactGlobalNamespaceRule,
  },
});

export default reactIdiomsPlugin;
