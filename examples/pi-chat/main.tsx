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
 * Run:  bun --conditions=@tooee/source examples/pi-chat/main.tsx
 *
 * Type in the input panel and press shift+Enter to send. Enter starts a new
 * line. A word like @shots/a.png attaches that image. Press Esc for cursor
 * mode, then Tab to move to the Messages panel and : for the command palette.
 * The palette and which-key list every command with its hotkey.
 */

import { launchCli } from "@tooee/shell";

import { PiChatApp } from "./app.js";

if (import.meta.main) {
  await launchCli(<PiChatApp />);
}
