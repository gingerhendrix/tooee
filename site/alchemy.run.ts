import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import * as Effect from "effect/Effect";

// Alchemy injects its Cloudflare Vite integration during dev and deploy, so
// one `vite build` produces both the TanStack Start Worker and the client
// assets. Asset routing keeps Alchemy's defaults, which match the Alchemy v1
// deployment: assets first, `auto-trailing-slash`, and no not-found fallback.
export const Website = Cloudflare.Website.Vite("Website", {
  // The physical Worker name that Alchemy v1 created for app `tooee-docs`,
  // resource `tooee-docs`, stage `gareth`. Keeping it lets the first v2
  // deploy adopt the live Worker instead of creating a second one.
  name: "tooee-docs-tooee-docs-gareth",
  compatibility: { date: "2026-03-17", flags: ["nodejs_compat"] },
  domain: "tooee.dev",
});

export default Alchemy.Stack(
  "TooeeDocs",
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  Effect.gen(function* () {
    const website = yield* Website;

    return { url: website.url.as<string>() };
  })
);
