#!/usr/bin/env bun
/**
 * ask-basic.ts - Demonstrates @tooee/ask for gathering user input
 *
 * This example shows:
 * - Prompting the user with a question
 * - Using placeholder text and default values
 * - Handling the submitted value via onSubmit callback
 * - Output goes to stdout for shell scripting
 *
 * Run: bun examples/ask-basic.ts
 * Controls: Type input, Enter to submit, Escape to cancel
 */

import { launch } from "@tooee/ask"

// Launch the ask prompt with configuration
launch({
  // The prompt displayed above the input field
  prompt: "What's your name?",

  // Placeholder text shown when input is empty
  placeholder: "Enter your name...",

  // Optional default value (uncomment to use)
  // defaultValue: "Anonymous",

  // Called when user presses Enter
  // The value is also printed to stdout for shell scripting
  onSubmit: (value) => {
    console.log(`Hello, ${value}!`)
  },
})
