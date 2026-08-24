import alchemy from "alchemy";
import { Website } from "alchemy/cloudflare";

const app = await alchemy("tooee-docs");

const site = await Website("tooee-docs", {
  assets: ".output/public",
  build: "bun run build",
  compatibility: "node",
  compatibilityDate: "2026-03-17",
  domains: ["tooee.dev"],
  entrypoint: ".output/server/index.mjs",
  noBundle: true,
  spa: false,
});

console.log({ url: site.url });
await app.finalize();
