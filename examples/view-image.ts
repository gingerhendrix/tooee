#!/usr/bin/env bun
/**
 * View an image in the terminal using half-block characters.
 * Usage: bun examples/view-image.ts <path-to-image>
 */

import { launch, createFileProvider } from "@tooee/view"

const imagePath = process.argv[2]

if (!imagePath) {
  console.error("Usage: bun examples/view-image.ts <path-to-image>")
  console.error("")
  console.error("Supported formats: PNG, JPG, JPEG, GIF, WebP, BMP, TIFF")
  process.exit(1)
}

launch({ contentProvider: createFileProvider(imagePath) })
