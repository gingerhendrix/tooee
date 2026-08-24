import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import mdx from "fumadocs-mdx/vite";

const config = defineConfig({
  // Nitro's SSR environment currently reports itself as development during a
  // production Vite build. Force the production JSX runtime so the generated
  // Cloudflare worker does not call React's intentionally undefined jsxDEV.
  esbuild: { jsxDev: false },
  plugins: [
    nitro({
      compatibilityDate: "2026-03-17",
      preset: "cloudflare_module",
      rollupConfig: { external: [/^@sentry\//u] },
    }),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    mdx(),
    tailwindcss(),
    tanstackStart({
      router: {
        quoteStyle: "double",
        semicolons: true,
      },
    }),
    viteReact({ include: /\.(?:jsx|tsx)$/u }),
  ],
});

export default config;
