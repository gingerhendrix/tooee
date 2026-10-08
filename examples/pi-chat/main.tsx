#!/usr/bin/env bun
/**
 * pi-chat - Tooee chat demo on the Pi SDK (@earendil-works/pi-coding-agent).
 *
 * Uses the models and credentials in ~/.pi/agent (read only). The session is
 * in memory and has no tools, so the assistant cannot change files.
 *
 * Run:  bun examples/pi-chat/main.tsx
 *
 * Input panel (insert mode):
 *   Enter        send the prompt (blocked while a reply streams)
 *   ctrl+o       select model
 *   ctrl+x       abort the reply
 *   Esc          cursor mode (then Tab switches panel, : palette, q quits)
 *
 * Messages panel (cursor mode):
 *   j / k        scroll; ctrl+d / ctrl+u page
 */

import { launchCli } from "@tooee/shell";

import { PiChatApp } from "./app.js";

if (import.meta.main) {
  await launchCli(<PiChatApp />);
}
