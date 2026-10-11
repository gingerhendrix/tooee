#!/usr/bin/env bun
/**
 * pi-chat - Tooee chat demo on the Pi SDK (@earendil-works/pi-coding-agent).
 *
 * Uses the models and credentials in ~/.pi/agent (read only). The session is
 * in memory. It has Pi's read-only tools (read, grep, find, ls) in the current
 * directory, so the assistant can read files but cannot run commands or
 * change files. Replies show thinking, tool calls, and tool results. Images
 * draw in the history under a caption such as `[image png · 12.3 KB]`.
 *
 * Run:  bun examples/pi-chat/main.tsx
 *
 * Input panel (insert mode):
 *   Enter        send the prompt (blocked while a reply streams);
 *                a word like @shots/a.png attaches that image
 *   ctrl+o       select model
 *   ctrl+t       cycle the thinking level
 *   ctrl+e       show or hide full thinking and tool output
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
