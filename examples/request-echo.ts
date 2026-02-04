#!/usr/bin/env bun
/**
 * request-echo.ts - Demonstrates @tooee/request with streaming response
 *
 * This example shows:
 * - Creating a RequestContentProvider with async streaming
 * - The submit() method returns an AsyncIterable<RequestChunk>
 * - Simulating streaming with character-by-character delay
 * - Using initialInput to pre-fill the input field
 *
 * Run: bun examples/request-echo.ts
 * Controls: Type input, Enter to submit, q quit, t/T cycle themes
 */

import { launch, type RequestContentProvider, type RequestChunk } from "@tooee/request"

// Helper to create a delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Create a streaming content provider that echoes input
const contentProvider: RequestContentProvider = {
  // submit() must return an AsyncIterable that yields RequestChunk objects
  async *submit(input: string): AsyncIterable<RequestChunk> {
    // Simulate processing delay
    yield { delta: "Processing: " }
    await sleep(200)

    // Stream the response character by character
    const response = `You said: "${input}"\n\nThis is a mock streaming response demonstrating the Request app's ability to handle async iteration.`

    for (const char of response) {
      yield { delta: char }
      // Small delay between characters to simulate streaming
      await sleep(20)
    }

    // Add a final newline
    yield { delta: "\n" }
  },
}

// Launch the request app
launch({
  contentProvider,

  // Optional: pre-fill the input field
  initialInput: "Hello, Tooee!",
})
