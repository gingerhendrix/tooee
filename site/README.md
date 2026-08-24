# Tooee documentation site

This package is the source for [tooee.dev](https://tooee.dev). It uses Fumadocs for the documentation experience, TanStack Start for routing and rendering, and Nitro's Cloudflare module output for deployment through Alchemy v2.

## Local development

Run commands from `site/`:

```bash
bun install
bun run dev
```

The local site is available at `http://localhost:3000`. Use `bun run check` to regenerate and validate the Fumadocs content collection and type-check the application. `bun run build` writes the deployable worker to `.output/server/index.mjs` and static assets to `.output/public`.

## Deploying

Deployment mutates the Cloudflare account and custom domain. Export these values before running it:

- `ALCHEMY_PASSWORD`: encrypts Alchemy secrets and state.
- `CLOUDFLARE_API_TOKEN`: a token allowed to deploy Workers and manage the `tooee.dev` custom domain.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account that owns the zone.

Then deploy from `site/`:

```bash
bun run deploy
```

Alchemy builds the site, uploads the Nitro worker and assets, and attaches `tooee.dev`. To intentionally remove the managed site, use `bun run destroy` with the same credentials. Neither command belongs in local validation or CI unless production mutation is intended.

Local dependencies, generated content, build output, Alchemy state, Wrangler state, and `.env` files are ignored. Do not commit credentials or generated output.
