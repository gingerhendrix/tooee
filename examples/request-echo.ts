#!/usr/bin/env bun
/**
 * request-echo.ts - Demonstrates streaming content with @tooee/view
 *
 * This example shows:
 * - Creating a ContentProvider with async streaming via load()
 * - Yielding ContentChunk objects to progressively build content
 * - Simulating streaming with character-by-character delay
 *
 * Run: bun examples/request-echo.ts
 * Controls: q quit, t/T cycle themes
 */

import { launch } from "@tooee/view";
import type { ContentProvider, ContentChunk } from "@tooee/view";

// Helper to create a delay
const sleep = async (ms: number) =>
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// Create a streaming content provider
const contentProvider: ContentProvider = {
  async *load(): AsyncIterable<ContentChunk> {
    yield { data: "Processing: ", format: "markdown", type: "append" };
    await sleep(200);

    // Stream the response character by character
    const response =
      "This is a mock streaming response demonstrating View's ability to handle async iteration via ContentProvider.load().";

    for (const char of response) {
      yield { data: char, format: "markdown", type: "append" };
      await sleep(20);
    }

    yield { data: "\n", format: "markdown", type: "append" };
  },
};

launch({ contentProvider });
