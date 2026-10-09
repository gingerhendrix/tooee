#!/usr/bin/env bun
/**
 * termcn - browse and run the termcn.dev OpenTUI component registry.
 *
 * Run from the repo root:
 *   bun --conditions=@tooee/source examples/termcn/main.tsx
 *
 * Live demos need the termcn source on disk (git-ignored, MIT licensed):
 *   bun examples/termcn/scripts/sync-vendor.ts
 *
 * Fetches are cached in ~/.cache/tooee-termcn ($TOOEE_TERMCN_CACHE overrides).
 *
 * Keys (cursor mode):
 *   Tab / Shift+Tab   switch panel
 *   j / k             move in the list, or scroll docs and source
 *   i                 filter the list (Esc returns to cursor mode)
 *   Enter             open the detail panel; in Preview, interact with the demo
 *   1 / 2 / 3         Preview, Docs, Source tabs
 *   n / p             next / previous demo
 *   Ctrl+G            leave interact mode
 *   y                 copy the install command
 *   r                 reload after an error
 *   t                 choose theme (demos follow it)
 *   q                 quit
 */

import { launchCli } from "@tooee/shell";

import { TermcnApp } from "./app.js";
import { createTermcnClient } from "./data/client.js";
import { VENDOR_DIR } from "./preview/vendor.js";

if (import.meta.main) {
  await launchCli(<TermcnApp client={createTermcnClient()} vendorDirectory={VENDOR_DIR} />);
}
