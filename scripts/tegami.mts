import { tegami } from "tegami";
import { runCli } from "tegami/cli";
import { github } from "tegami/plugins/github";
import type { TegamiPlugin } from "tegami";

/** Preserve Tooee's existing shared v<version> tag and GitHub release. */
const sharedReleaseTag = (): TegamiPlugin => ({
  enforce: "post",
  initPublishPlan({ plan }) {
    const versions = new Set<string>();

    for (const [id, packagePlan] of plan.packages) {
      const pkg = this.graph.get(id);
      if (pkg?.group?.name !== "tooee" || pkg.version === undefined) {
        continue;
      }

      versions.add(pkg.version);
      packagePlan.git ??= {};
      packagePlan.git.tag = `v${pkg.version}`;
    }

    if (versions.size > 1) {
      throw new Error(
        `Tooee release packages have mismatched versions: ${[...versions].join(", ")}`,
      );
    }
  },
  name: "tooee-shared-release-tag",
});

const paper = tegami({
  groups: {
    tooee: {
      syncBump: true,
      syncGitTag: true,
    },
  },
  ignore: ["tooee", "@tooee/e2e", "@tooee/examples"],
  npm: {
    client: "bun",
    trustedPublish: {
      provider: "github",
      workflow: "publish.yml",
    },
  },
  packages: {
    "@tooee/ask": { group: "tooee" },
    "@tooee/choose": { group: "tooee" },
    "@tooee/cli": { group: "tooee" },
    "@tooee/clipboard": { group: "tooee" },
    "@tooee/commands": { group: "tooee" },
    "@tooee/config": { group: "tooee" },
    "@tooee/fuzzy": { group: "tooee" },
    "@tooee/layout": { group: "tooee" },
    "@tooee/marks": { group: "tooee" },
    "@tooee/overlays": { group: "tooee" },
    "@tooee/panels": { group: "tooee" },
    "@tooee/renderers": { group: "tooee" },
    "@tooee/router": { group: "tooee" },
    "@tooee/search": { group: "tooee" },
    "@tooee/shell": { group: "tooee" },
    "@tooee/themes": { group: "tooee" },
    "@tooee/toasts": { group: "tooee" },
    "@tooee/view": { group: "tooee" },
  },
  plugins: [
    github({
      repo: "gingerhendrix/tooee",
      versionPr: {
        base: "main",
      },
    }),
    sharedReleaseTag(),
  ],
});

await runCli(paper);
