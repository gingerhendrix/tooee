# Tooee documentation site

This package is the source for [tooee.dev](https://tooee.dev). It uses Fumadocs for the documentation experience, TanStack Start for routing and rendering, and Alchemy v2 (`Cloudflare.Website.Vite`) to build and deploy it as a Cloudflare Worker.

## Local development

Run commands from `site/`:

```bash
bun install
bun run dev
```

The local site is available at `http://localhost:3000`. Use `bun run check` to regenerate and validate the Fumadocs content collection and type-check the application. `bun run build` runs a plain `vite build` into `dist/`. Deploys do not use that output: `alchemy deploy` runs its own Vite build with the Cloudflare plugin injected.

## Deploying

Deployment mutates the Cloudflare account and the `tooee.dev` custom domain. Alchemy v2 keeps its state in the Cloudflare account (`Cloudflare.state()`) and reads credentials from an Alchemy profile (`ALCHEMY_PROFILE`, or the `default` profile). The profile's API token needs Workers, the `tooee.dev` zone and Secrets Store Write, which the state store uses.

All scripts use the `prod` stage. Run them from `site/`:

```bash
bun run plan     # preview only
bun run deploy   # build, upload the Worker and assets, attach tooee.dev
```

The stack pins the Worker name `tooee-docs-tooee-docs-gareth`, which Alchemy v1 created. The first v2 deploy must adopt it:

```bash
bun alchemy plan --stage prod --adopt
bun alchemy deploy --stage prod --adopt
```

After that deploy passes a smoke check, delete the old ignored v1 state folder `site/.alchemy/tooee-docs/`. Do not run an Alchemy v1 destroy, because the v1 state still points at the adopted Worker.

To intentionally remove the managed site, use `bun run destroy`. None of these commands belongs in local validation or CI unless production mutation is intended.

Local dependencies, generated content, build output, Alchemy state, Wrangler state, and `.env` files are ignored. Do not commit credentials or generated output.
