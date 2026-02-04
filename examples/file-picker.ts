#!/usr/bin/env bun
/**
 * file-picker.ts - Fuzzy file picker
 *
 * Pick a file using fuzzy search, outputs the path to stdout.
 * Uses `fd` if available, falls back to `find`.
 *
 * Run: bun examples/file-picker.ts
 * Controls: j/k navigate, / filter, Enter select, q quit
 */

import { launch, type ChooseItem } from "@tooee/choose"

async function commandExists(cmd: string): Promise<boolean> {
  const proc = Bun.spawn(["which", cmd], { stdout: "pipe", stderr: "pipe" })
  await proc.exited
  return proc.exitCode === 0
}

const fileProvider = {
  async load(): Promise<ChooseItem[]> {
    // Prefer fd for speed, fall back to find
    const hasFd = await commandExists("fd")

    const proc = hasFd
      ? Bun.spawn(["fd", "--type", "f", "--hidden", "--exclude", ".git", "--max-results", "1000"])
      : Bun.spawn(["find", ".", "-type", "f", "-not", "-path", "*/.git/*", "-maxdepth", "10"])

    const text = await new Response(proc.stdout).text()
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      return [{ text: "Failed to list files", value: "" }]
    }

    const files = text.trim().split("\n").filter(Boolean).slice(0, 1000) // Limit for performance

    if (files.length === 0) {
      return [{ text: "No files found", value: "" }]
    }

    // Get file extension icons
    const getIcon = (path: string): string => {
      const ext = path.split(".").pop()?.toLowerCase()
      const icons: Record<string, string> = {
        ts: "\u{1F4DC}",
        tsx: "\u{269B}",
        js: "\u{1F7E1}",
        jsx: "\u{269B}",
        json: "\u{1F4CB}",
        md: "\u{1F4DD}",
        css: "\u{1F3A8}",
        html: "\u{1F310}",
        py: "\u{1F40D}",
        rs: "\u{2699}",
        go: "\u{1F439}",
        sh: "\u{1F4BB}",
      }
      return icons[ext || ""] || "\u{1F4C4}"
    }

    return files.map((file) => ({
      text: file,
      value: file,
      icon: getIcon(file),
    }))
  },
}

async function main() {
  const result = await launch({
    contentProvider: fileProvider,
    options: { prompt: "Pick a file" },
  })

  if (result && result.items[0].value) {
    // Output selected file path to stdout
    console.log(result.items[0].value)
  }
}

main()
